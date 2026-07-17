/* eslint-disable no-console */

/**
 * ────────────────────────────────────────────────────────────────────────
 *  נושאי תלמיד — דפדפן תכנית-הלימודים המלאה (כיתות א׳–ו׳)
 * ────────────────────────────────────────────────────────────────────────
 *  לכל כיתה: הנושאים → תת-הנושאים → לכל תת-נושא: מה הילד צריך לדעת (מטרות),
 *  מה נדרש מהמורה כדי להביא להבנה, טעויות נפוצות, שלוש רמות קושי עם תרגילי-
 *  דוגמה, ומבחן-דוגמה מייצג לכיתה. המקור: מחקר תכנית הלימודים (curriculum-data.js).
 */
(function () {
  "use strict";
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const el = (t, c, h) => { const e = document.createElement(t); if (c) e.className = c; if (h != null) e.innerHTML = h; return e; };
  const GRADE_LETTER = { 1: "א", 2: "ב", 3: "ג", 4: "ד", 5: "ה", 6: "ו" };
  const STRAND_CLASS = {
    "מספר וחשבון": "s-num", "מספרים וחשבון": "s-num", "מספר וכמות": "s-num",
    "גיאומטריה ומדידות": "s-geo", "גאומטריה ומדידות": "s-geo", "גיאומטריה": "s-geo", "מדידות": "s-geo",
    "אלגברה ודפוסים": "s-alg", "אלגברה": "s-alg", "דפוסים": "s-alg",
    "נתונים והסתברות": "s-dat", "נתונים": "s-dat", "סטטיסטיקה והסתברות": "s-dat",
  };
  const strandClass = (s) => STRAND_CLASS[String(s || "").trim()] || "s-num";

  function dataFor(gradeNum) {
    const bank = window.VelaCurriculum;
    if (!bank) return null;
    return bank[GRADE_LETTER[gradeNum]] || bank[gradeNum] || null;
  }

  // מצב פתיחה לכל כיתה (איזה נושא/תת-נושא פתוח) — נשמר בין ניווטים
  const openState = {};

  function render(container, gradeNum, gradeLabel) {
    const data = dataFor(gradeNum);
    if (!data) {
      container.innerHTML = `<div class="curEmpty">
        <div class="curEmpty__ico">📚</div>
        <div class="curEmpty__t">תכנית הלימודים לכיתה זו עדיין בהכנה</div>
        <div class="curEmpty__s">המחקר רץ — הנושאים, המטרות ומבחני-הדוגמה ייטענו כאן בסיום.</div>
      </div>`;
      return;
    }
    const key = GRADE_LETTER[gradeNum] || gradeNum;
    openState[key] = openState[key] || { topic: null, subs: {} };
    const st = openState[key];

    const nTopics = data.topics.length;
    const nSub = data.topics.reduce((a, t) => a + (t.subtopics ? t.subtopics.length : 0), 0);

    const wrap = el("div", "cur");
    wrap.innerHTML = `
      <div class="curIntro">
        <div class="curIntro__t">תכנית הלימודים המלאה — כיתה ${esc(gradeLabel || key)}</div>
        <div class="curIntro__s">${nTopics} נושאים · ${nSub} תת-נושאים · לכל תת-נושא: מה הילד צריך לדעת, מה נדרש מהמורה, רמות קושי וטעויות נפוצות.</div>
      </div>
      <div class="curTopics" id="curTopics"></div>
      ${data.sampleTest ? `<button class="curTestBtn" id="curTestBtn">📝 מבחן-דוגמה לכיתה ${esc(gradeLabel || key)}</button>` : ""}`;
    container.innerHTML = "";
    container.appendChild(wrap);

    const list = wrap.querySelector("#curTopics");
    data.topics.forEach((topic, ti) => list.appendChild(topicNode(topic, ti, st)));

    const testBtn = wrap.querySelector("#curTestBtn");
    if (testBtn) testBtn.addEventListener("click", () => openTest(data.sampleTest, gradeLabel || key));
  }

  function topicNode(topic, ti, st) {
    const isOpen = st.topic === ti;
    const node = el("div", "curTopic" + (isOpen ? " is-open" : ""));
    const subN = topic.subtopics ? topic.subtopics.length : 0;
    node.innerHTML = `
      <button class="curTopic__head">
        <span class="curStrand ${strandClass(topic.strand)}">${esc(topic.strand || "")}</span>
        <span class="curTopic__name">${esc(topic.name)}</span>
        <span class="curTopic__meta">${subN} תת-נושאים</span>
        <span class="curTopic__chev">▾</span>
      </button>
      <div class="curTopic__body"></div>`;
    const body = node.querySelector(".curTopic__body");
    node.querySelector(".curTopic__head").addEventListener("click", () => {
      st.topic = isOpen ? null : ti;
      // רינדור-מחדש רך: פותח/סוגר בלי לאבד מצב
      const parent = node.parentNode;
      const fresh = topicNode(topic, ti, st);
      parent.replaceChild(fresh, node);
    });
    if (isOpen) (topic.subtopics || []).forEach((sub, si) => body.appendChild(subNode(sub, ti, si, st)));
    return node;
  }

  function subNode(sub, ti, si, st) {
    const skey = ti + ":" + si;
    const isOpen = !!st.subs[skey];
    const node = el("div", "curSub" + (isOpen ? " is-open" : ""));
    const levels = (sub.levels || []).slice().sort((a, b) => (a.n || 0) - (b.n || 0));
    node.innerHTML = `
      <button class="curSub__head">
        <span class="curSub__dot"></span>
        <span class="curSub__name">${esc(sub.name)}</span>
        <span class="curSub__chev">＋</span>
      </button>
      <div class="curSub__body">
        ${sub.goals && sub.goals.length ? `
          <div class="curBlock">
            <div class="curBlock__t">🎯 מה הילד צריך לדעת</div>
            <ul class="curGoals">${sub.goals.map((g) => `<li>${esc(g)}</li>`).join("")}</ul>
          </div>` : ""}
        ${sub.teacher ? `
          <div class="curBlock">
            <div class="curBlock__t">👩‍🏫 מה נדרש מהמורה</div>
            <div class="curTeacher">${esc(sub.teacher)}</div>
          </div>` : ""}
        ${levels.length ? `
          <div class="curBlock">
            <div class="curBlock__t">📊 רמות קושי</div>
            <div class="curLevels">${levels.map((lv) => `
              <div class="curLevel lvl-${lv.n || 1}">
                <div class="curLevel__top"><span class="curLevel__badge">${esc(lv.label || ("רמה " + (lv.n || 1)))}</span></div>
                <div class="curLevel__desc">${esc(lv.desc || "")}</div>
                ${lv.example ? `<div class="curLevel__ex"><span>דוגמה</span>${esc(lv.example)}</div>` : ""}
              </div>`).join("")}</div>
          </div>` : ""}
        ${sub.misconceptions && sub.misconceptions.length ? `
          <div class="curBlock">
            <div class="curBlock__t">⚠️ טעויות נפוצות</div>
            <ul class="curMiss">${sub.misconceptions.map((m) => `<li>${esc(m)}</li>`).join("")}</ul>
          </div>` : ""}
      </div>`;
    node.querySelector(".curSub__head").addEventListener("click", () => {
      st.subs[skey] = !isOpen;
      const fresh = subNode(sub, ti, si, st);
      node.parentNode.replaceChild(fresh, node);
    });
    return node;
  }

  /* ── מבחן-דוגמה — חלון מלא ── */
  function openTest(test, gradeLabel) {
    const ov = el("div", "curTestOv");
    let showAns = false;
    const items = test.items || [];
    function paint() {
      ov.innerHTML = `
        <div class="curTest">
          <div class="curTest__bar">
            <button class="curTest__x" id="curTx">✕</button>
            <div class="curTest__ttl">${esc(test.title || ("מבחן-דוגמה · כיתה " + gradeLabel))}</div>
            <span class="gspacer" style="flex:1"></span>
            <button class="curTest__ans" id="curTa">${showAns ? "הסתר תשובות" : "הצג תשובות"}</button>
          </div>
          <div class="curTest__sheet">
            <div class="curTest__head">
              <div class="curTest__h1">${esc(test.title || "מבחן במתמטיקה")}</div>
              <div class="curTest__meta">כיתה ${esc(gradeLabel)} · ${items.length} שאלות · שם: ____________</div>
            </div>
            <ol class="curTest__items">${items.map((it, i) => `
              <li class="curTestItem">
                <div class="curTestItem__q"><b>${i + 1}.</b> ${esc(it.q)}
                  ${it.level ? `<span class="curTestItem__lvl">רמה ${esc(it.level)}</span>` : ""}
                  ${it.topic ? `<span class="curTestItem__topic">${esc(it.topic)}</span>` : ""}
                </div>
                <div class="curTestItem__a ${showAns ? "is-on" : ""}">תשובה: <b>${esc(it.answer)}</b></div>
              </li>`).join("")}</ol>
          </div>
        </div>`;
      ov.querySelector("#curTx").addEventListener("click", () => ov.remove());
      ov.querySelector("#curTa").addEventListener("click", () => { showAns = !showAns; paint(); });
    }
    paint();
    ov.addEventListener("click", (e) => { if (e.target === ov) ov.remove(); });
    document.body.appendChild(ov);
  }

  window.VelaCurriculumUI = { render, hasData: (gn) => !!dataFor(gn) };
})();
