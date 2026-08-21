/**
 * vela · teacher-live — דמות המורה חיה בתוך הדף.
 *
 * במקום סרטון: הדמות מורכבת משכבות (זנב-הילה, גוף, יד, עיניים) שחתכנו
 * מהאיור המקורי, וכל שכבה מונפשת בנפרד בדפדפן — 60fps על ה-GPU, חדה בכל
 * גודל, ובאמת אינטראקטיבית:
 *   · מרחפת בעדינות, הזנב מתנועע כמו ערפל
 *   · מנופפת לשלום כל כמה שניות (וגם כשעוברים עליה עם העכבר)
 *   · ממצמצת (טלאי עיניים-פקוחות מעל הפנים; מצמוץ = חשיפת העצומות לרגע)
 *   · עוקבת עם המבט והגוף אחרי סמן-העכבר של הילד
 *
 * שימוש:
 *   <script src="/teacher-live.js"></script>
 *   VelaTeacher.mount("#slot", { size: 220 });
 *
 * אפשרויות: size (px, ברירת-מחדל 200) · follow (ברירת-מחדל true)
 *           · wave (true) · blink (true)
 * מכבד prefers-reduced-motion: בלי תנועה, רק התמונה.
 */
(function () {
  "use strict";
  const BASE = "/teacher-character/live/";
  const SPACE = 1254; // מרחב-הקואורדינטות של האיור המקורי
  const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // שכבות: [קובץ, x, y, w, h] במרחב המקורי
  const LAYERS = {
    tail: ["tail.png", 199, 826, 632, 288],
    hand: ["hand.png", 283, 464, 136, 157],
    body: ["body-nowave.png", 0, 0, 1254, 1254],
    eyes: ["eyes-open.png", 492, 340, 317, 159],
  };

  let styleInjected = false;
  function injectStyle() {
    if (styleInjected) return;
    styleInjected = true;
    const s = document.createElement("style");
    s.textContent = `
      .vt { position: relative; display: inline-block; user-select: none; -webkit-user-select: none; }
      .vt__stage { position: absolute; inset: 0; will-change: transform; }
      .vt img { position: absolute; pointer-events: none; }
      .vt__shadow {
        position: absolute; left: 26%; right: 26%; bottom: 1%; height: 5%;
        border-radius: 50%; background: radial-gradient(ellipse, rgba(70,110,130,.30), transparent 70%);
        filter: blur(3px);
        animation: vtShadow 4s ease-in-out infinite;
      }
      .vt__tail  { transform-origin: 57% 6%;  animation: vtTail 3.4s ease-in-out infinite; }
      .vt__hand  { transform-origin: 77% 87%; animation: vtWave 7s ease-in-out infinite; }
      .vt__float { animation: vtFloat 4s ease-in-out infinite; will-change: transform; }
      .vt__eyes  { animation: vtBlink 4.6s linear infinite; }
      .vt.vt--hi .vt__hand { animation-duration: 1.1s; }
      @keyframes vtFloat { 0%,100% { transform: translateY(0.8%); } 50% { transform: translateY(-0.8%); } }
      @keyframes vtShadow { 0%,100% { transform: scaleX(1); opacity: .9; } 50% { transform: scaleX(.88); opacity: .65; } }
      @keyframes vtTail {
        0%,100% { transform: rotate(-2.2deg) skewX(1.5deg) scaleY(1); }
        35%     { transform: rotate(1.8deg)  skewX(-2deg)  scaleY(1.03); }
        70%     { transform: rotate(-0.6deg) skewX(0.5deg) scaleY(0.99); }
      }
      @keyframes vtWave {
        0%, 8%  { transform: rotate(0deg); }
        11%     { transform: rotate(-13deg); }
        15%     { transform: rotate(9deg); }
        19%     { transform: rotate(-12deg); }
        23%     { transform: rotate(8deg); }
        27%     { transform: rotate(0deg); }
        100%    { transform: rotate(0deg); }
      }
      @keyframes vtBlink {
        0%, 90.5%, 94.5%, 100% { opacity: 1; }
        91.5%, 93.5%           { opacity: 0; }
      }
      @media (prefers-reduced-motion: reduce) {
        .vt *, .vt { animation: none !important; }
      }
    `;
    document.head.appendChild(s);
  }

  function mount(target, opts = {}) {
    injectStyle();
    const host = typeof target === "string" ? document.querySelector(target) : target;
    if (!host) return null;
    const size = opts.size || 200;
    const follow = opts.follow !== false && !REDUCED;

    const root = document.createElement("div");
    root.className = "vt";
    root.style.width = size + "px";
    root.style.height = size + "px";

    const pct = (v) => (v / SPACE) * 100 + "%";
    const layer = (key, cls) => {
      const [file, x, y, w, h] = LAYERS[key];
      const img = document.createElement("img");
      img.src = BASE + file;
      img.alt = "";
      img.draggable = false;
      img.className = cls;
      img.style.left = pct(x);
      img.style.top = pct(y);
      img.style.width = pct(w);
      img.style.height = pct(h);
      return img;
    };

    const shadow = document.createElement("div");
    shadow.className = "vt__shadow";
    root.appendChild(shadow);

    const stage = document.createElement("div"); // מוטה לכיוון הסמן (JS)
    stage.className = "vt__stage";
    const float = document.createElement("div"); // מרחף (CSS)
    float.className = "vt__float";
    float.style.position = "absolute";
    float.style.inset = "0";

    const tail = layer("tail", "vt__tail");
    const hand = layer("hand", "vt__hand");
    const body = layer("body", "vt__body");
    const eyes = layer("eyes", "vt__eyes");
    if (opts.wave === false) hand.style.animation = "none";
    if (opts.blink === false || REDUCED) eyes.style.animation = "none";

    float.append(tail, hand, body, eyes);
    stage.appendChild(float);
    root.appendChild(stage);
    host.appendChild(root);

    // נפנוף נלהב כשעוברים על הדמות עם העכבר
    root.addEventListener("pointerenter", () => root.classList.add("vt--hi"));
    root.addEventListener("pointerleave", () => root.classList.remove("vt--hi"));

    /* ---- מעקב-מבט: הגוף נוטה והעיניים "מסתכלות" לכיוון הסמן ---- */
    let raf = 0;
    if (follow) {
      let tx = 0, ty = 0;      // יעד (-1..1)
      let cx = 0, cy = 0;      // מצב נוכחי (lerp)
      const onMove = (e) => {
        const r = root.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        const reach = Math.max(innerWidth, innerHeight) * 0.5;
        tx = Math.max(-1, Math.min(1, dx / reach));
        ty = Math.max(-1, Math.min(1, dy / reach));
      };
      addEventListener("pointermove", onMove, { passive: true });
      const tick = () => {
        cx += (tx - cx) * 0.07;
        cy += (ty - cy) * 0.07;
        // הגוף נוטה מעט; העיניים זזות קצת יותר — נראה כאילו הוא מסתכל
        stage.style.transform =
          `rotate(${(cx * 4).toFixed(2)}deg) translate(${(cx * 1.6).toFixed(2)}%, ${(cy * 1.2).toFixed(2)}%)`;
        eyes.style.translate =
          `${(cx * size * 0.012).toFixed(1)}px ${(cy * size * 0.010).toFixed(1)}px`;
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      root._vtCleanup = () => {
        removeEventListener("pointermove", onMove);
        cancelAnimationFrame(raf);
      };
    }

    return {
      el: root,
      destroy() {
        if (root._vtCleanup) root._vtCleanup();
        root.remove();
      },
    };
  }

  window.VelaTeacher = { mount };
})();
