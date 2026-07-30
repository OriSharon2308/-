/* eslint-disable no-var */
// איור לכל נושא — מקור אמת אחד לאזור התרגול ולאזור הלמידה.
// הקבצים: images/topics/<slug>.png  (נופל ל-.svg אם אין png)
// העלאה בגרירה: /topic-images  · הרשימה בשרת: TOPIC_IMAGE_SLUGS ב-server.js
(function () {
  "use strict";

  // הסדר קובע: "חיבור וחיסור" לפני "חיבור", "מילולי" לפני הפעולה.
  var MAP = [
    [/חיבור\s*וחיסור/, "add-sub"],
    [/מילולי/, "word-problems"],
    [/כסף|מטבע|שטר/, "money"],
    [/שעון|שעה/, "clock"],
    [/צלע|קודקוד|צורה|צורות|גאומטר|משולש|ריבוע/, "shapes"],
    [/כפל/, "multiplication"],
    [/חילוק/, "division"],
    [/שבר/, "fractions"],
    [/אחוז/, "percent"],
    [/עשרוני/, "decimals"],
    [/מדיד|אורך|משקל|נפח|שטח|היקף/, "measure"],
    [/נעלם|משוו/, "equations"],
    [/יחס|פרופור/, "ratio"],
    [/חיבור/, "addition"],
    [/חיסור/, "subtraction"],
    [/מספר|ספיר|מנ[יי]ה/, "numbers"],
  ];

  /** מחזיר את שם קובץ-האיור לנושא (בלי סיומת), או null אם אין התאמה. */
  function slugFor(key, parent) {
    var sources = [key, parent];
    for (var i = 0; i < sources.length; i++) {
      var s = sources[i];
      if (!s) continue;
      for (var j = 0; j < MAP.length; j++) {
        if (MAP[j][0].test(s)) return MAP[j][1];
      }
    }
    return null;
  }

  /** תג <img> לאיור. cls = מחלקה; onLoadCls = מחלקה שתתווסף להורה כשהתמונה נטענה. */
  function imgHtml(slug, cls, onLoadCls) {
    if (!slug) return "";
    var load = onLoadCls ? ` onload="this.parentNode.classList.add('${onLoadCls}')"` : "";
    return (
      `<img class="${cls || "topicArt"}" src="/images/topics/${slug}.png" alt="" aria-hidden="true" draggable="false"${load}` +
      ` onerror="if(!this.dataset.alt){this.dataset.alt=1;this.src='/images/topics/${slug}.svg'}else{this.remove()}" />`
    );
  }

  window.velaTopicArt = { slugFor: slugFor, imgHtml: imgHtml };
})();
