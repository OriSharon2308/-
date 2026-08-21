/**
 * vela · screen-fit — האתר מתאים את עצמו לגודל מסך המחשב.
 *
 * הבעיה: דף שעוצב לרוחב ~1100px נראה קטן ואבוד באמצע מסך 24"/27",
 * עם שוליים ריקים ענקיים. הפתרון: מודדים כמה המסך רחב מרוחב-העיצוב,
 * ומגדילים את כל הדף פרופורציונלית (zoom) — טקסט, תמונות, גרפים, הכל.
 *
 * על מסכים קטנים (לפטופ צר, מובייל) לא נוגעים כלום (scale=1) —
 * שם ה-CSS הרספונסיבי של כל דף ממשיך לעבוד כרגיל.
 *
 * שימוש בכל דף:
 *   <script src="/screen-fit.js" data-design="1160" data-max="1.5"></script>
 *   data-design — הרוחב (px) שעבורו הדף עוצב (ברירת מחדל 1160)
 *   data-max    — תקרת ההגדלה (ברירת מחדל 1.5, שלא ייראה מצויר)
 */
(function () {
  "use strict";
  var el = document.currentScript;
  var DESIGN = parseFloat(el && el.getAttribute("data-design")) || 1160;
  var MAX = parseFloat(el && el.getAttribute("data-max")) || 1.5;

  function fit() {
    var scale = Math.min(Math.max(window.innerWidth / DESIGN, 1), MAX);
    // מדרגות של רבע-אחוז — שלא נרנדר מחדש על כל פיקסל בזמן גרירת חלון
    scale = Math.round(scale * 400) / 400;
    document.documentElement.style.zoom = scale === 1 ? "" : String(scale);
  }

  var t = null;
  window.addEventListener("resize", function () {
    clearTimeout(t);
    t = setTimeout(fit, 80);
  });
  fit();
})();
