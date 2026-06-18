/* ============ ריפרש מתחיל תמיד ממסך הפתיחה (ביטול שחזור גלילה של הדפדפן) ============ */
if ("scrollRestoration" in history) history.scrollRestoration = "manual";
window.scrollTo(0, 0);
window.addEventListener("load", () => window.scrollTo(0, 0));

/* ============ דף נחיתה — טוגל מאוזן (כניסה/הרשמה), טופס נפתח בלחיצה ============ */
(function () {
  const tabLogin = document.getElementById("tabLogin");
  const tabRegister = document.getElementById("tabRegister");
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");
  const errorBox = document.getElementById("authError");
  const tabIndicator = document.querySelector(".authTabs__indicator");

  function moveIndicator(tab, instant) {
    if (!tabIndicator || !tab) return;
    if (instant) tabIndicator.style.transition = "none";
    tabIndicator.style.width = `${tab.offsetWidth}px`;
    tabIndicator.style.transform = `translateX(${tab.offsetLeft}px)`;
    if (instant) {
      void tabIndicator.offsetWidth;
      tabIndicator.style.transition = "";
    }
  }

  function showError(messages) {
    const text = Array.isArray(messages) ? messages.join("\n") : String(messages);
    errorBox.textContent = text;
    errorBox.hidden = !text;
  }
  function clearError() {
    errorBox.hidden = true;
    errorBox.textContent = "";
  }

  const authBox = document.querySelector(".authBox");

  // מריץ שינוי תוכן עם אנימציית גובה חלקה של הריבוע הלבן (התרחבות/התכווצות)
  function transitionBox(apply) {
    if (!authBox) {
      apply();
      return;
    }
    const reduce =
      window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      apply();
      authBox.style.height = "";
      return;
    }
    const start = authBox.offsetHeight;
    apply();
    const end = authBox.offsetHeight;
    if (start === end) {
      authBox.style.height = "";
      return;
    }
    authBox.style.height = `${start}px`;
    void authBox.offsetHeight; // reflow
    authBox.style.height = `${end}px`;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      authBox.style.height = ""; // חזרה ל-auto
      authBox.removeEventListener("transitionend", onEnd);
    };
    const onEnd = (e) => {
      if (e.target === authBox && e.propertyName === "height") finish();
    };
    authBox.addEventListener("transitionend", onEnd);
    window.setTimeout(finish, 520);
  }

  // בלחיצה על אחד הכפתורים — נפתח רק הטופס שלו (השני נסגר), עם מעבר גובה חלק
  function selectTab(which) {
    const login = which === "login";
    const showForm = login ? loginForm : registerForm;
    const hideForm = login ? registerForm : loginForm;
    transitionBox(() => {
      clearError();
      if (authBox) authBox.classList.remove("authBox--closed");
      tabLogin.classList.toggle("authTab--active", login);
      tabRegister.classList.toggle("authTab--active", !login);
      if (tabIndicator) tabIndicator.style.opacity = "1";
      moveIndicator(login ? tabLogin : tabRegister, false);

      hideForm.hidden = true;
      hideForm.classList.remove("authForm--in");
      showForm.hidden = false;
      showForm.classList.remove("authForm--in");
      void showForm.offsetWidth;
      showForm.classList.add("authForm--in");
    });
    // פתיחת טופס → גלילה לנקודת ה-snap של ה-hero (התוכן ממורכז + הערפל מלא),
    // כך שהטופס מוצג במלואו במרכז ולא נדחף ע"י הפאנל הבא.
    const reduce =
      window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (window.scrollTo) {
      window.scrollTo({ top: window.innerHeight, behavior: reduce ? "auto" : "smooth" });
    }
  }

  tabLogin.addEventListener("click", () => selectTab("login"));
  tabRegister.addEventListener("click", () => selectTab("register"));

  window.addEventListener("resize", () => {
    const active = document.querySelector(".authTab--active");
    if (active) moveIndicator(active, true);
  });

  // הצג/הסתר סיסמה
  document.querySelectorAll(".pwToggle").forEach((btn) => {
    btn.addEventListener("click", () => {
      const input = btn.parentElement.querySelector("input");
      if (!input) return;
      const show = input.type === "password";
      input.type = show ? "text" : "password";
      btn.textContent = show ? "🙈" : "👁";
      btn.setAttribute("aria-label", show ? "הסתר סיסמה" : "הצג סיסמה");
    });
  });

  async function post(url, body) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      return { ok: res.ok && data.ok, data };
    } catch {
      return { ok: false, data: { errors: ["שגיאת רשת — בדוק/י שהשרת פעיל."] } };
    }
  }

  function disable(form, on) {
    form.querySelectorAll("input, select, button").forEach((el) => (el.disabled = on));
  }

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearError();
    disable(loginForm, true);
    const result = await post("/api/login", {
      username: document.getElementById("loginUsername").value,
      password: document.getElementById("loginPassword").value,
    });
    disable(loginForm, false);
    if (result.ok) {
      window.location.href = "/";
    } else {
      showError(result.data.errors || ["שם משתמש או סיסמה שגויים."]);
    }
  });

  // בחירת בן/בת בכפתורי תמונה
  document.querySelectorAll(".genderBtn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const hidden = document.getElementById("regGender");
      if (hidden) hidden.value = btn.dataset.gender;
      document.querySelectorAll(".genderBtn").forEach((b) => {
        const on = b === btn;
        b.classList.toggle("is-selected", on);
        b.setAttribute("aria-pressed", on ? "true" : "false");
      });
    });
  });

  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearError();
    if (!document.getElementById("regGender").value) {
      showError(["צריך לבחור בן או בת."]);
      return;
    }
    disable(registerForm, true);
    const result = await post("/api/register", {
      username: document.getElementById("regUsername").value,
      email: document.getElementById("regEmail").value,
      age: document.getElementById("regAge").value,
      grade: document.getElementById("regGrade").value,
      gender: document.getElementById("regGender").value,
      school: document.getElementById("regSchool").value,
      password: document.getElementById("regPassword").value,
    });
    disable(registerForm, false);
    if (result.ok) {
      window.location.href = "/";
    } else {
      showError(result.data.errors || ["ההרשמה נכשלה."]);
    }
  });
})();

/* ============ חשיפה בגלילה לסקשנים ============ */
(function reveals() {
  const reduce =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const els = Array.from(
    document.querySelectorAll(".lpSection__title, .lpStep, .feature, .lpParents__panel")
  );
  if (!els.length || reduce || !("IntersectionObserver" in window)) return;
  els.forEach((el) => {
    el.style.opacity = "0";
    el.style.transform = "translateY(28px)";
    el.style.transition = "opacity .6s ease, transform .7s cubic-bezier(.22,1,.36,1)";
  });
  const io = new IntersectionObserver(
    (ents) => {
      ents.forEach((e) => {
        if (e.isIntersecting) {
          e.target.style.opacity = "1";
          e.target.style.transform = "none";
          io.unobserve(e.target);
        }
      });
    },
    { threshold: 0.14 }
  );
  els.forEach((el) => io.observe(el));
  window.setTimeout(() => els.forEach((el) => { el.style.opacity = "1"; el.style.transform = "none"; }), 3000);
})();

/* ============ סצנת גלילה ל-hero: מסך 1 (vela בערפל + סרגל למטה) → מסך 2 (ברוכים הבאים) ============
   הערפל עולה מהר וממלא; הסרגל עולה לאט (פרלקסה); "ברוכים הבאים" דוהה פנימה (opacity) לקראת הסוף. */
(function heroScene() {
  const word = document.querySelector(".lpHero__word");
  const veil = document.querySelector(".lpHero__veil");
  const welcome = document.getElementById("heroWelcome");
  const bar = document.getElementById("heroBar");
  const hint = document.querySelector(".lpHero__bar .lpScrollHint");
  const math = document.getElementById("heroMath");
  const lateSyms = math ? math.querySelectorAll(".mathSym--late") : [];
  if (!word || !bar) return;
  const reduce =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  if (reduce) {
    // ללא תנועה: מצב סטטי של מסך 2 (ערפל מלא, vela מוסתרת, ברכה גלויה, סימבולים בהירים מלאים)
    if (welcome) {
      welcome.style.opacity = "1";
      welcome.style.transform = "none";
    }
    bar.style.transform = "none";
    if (veil) veil.style.setProperty("--fogLine", "126%");
    word.style.opacity = "0";
    word.style.visibility = "hidden";
    if (math) {
      math.style.setProperty("--mathReveal", "126%");
      math.style.setProperty("--mathTop", "rgb(226, 230, 232)");
      math.style.setProperty("--mathBot", "rgb(200, 205, 207)");
    }
    for (let i = 0; i < lateSyms.length; i++) lateSyms[i].style.opacity = "1";
    return;
  }

  let ticking = false;
  function update() {
    ticking = false;
    const vh = window.innerHeight || 1;
    const p = clamp(window.scrollY / vh, 0, 1); // ביט ה-hero לאורך מסך אחד

    // הסרגל עולה לאט: מהתחתית (מסך 1) למקומו הטבעי מתחת ל"ברוכים הבאים" (מסך 2)
    const barP = clamp(p / 0.9, 0, 1);
    bar.style.transform = `translateY(${((1 - barP) * 0.3 * vh).toFixed(1)}px)`;

    // הערפל עולה מהר: בנק הערפל ממלא את הרקע עד ~p=0.5
    if (veil) veil.style.setProperty("--fogLine", Math.min(126, 4 + p * 250).toFixed(1) + "%");

    // ה-vela: התחתית בערפל (מסך 1), מתמוססת מהר בגלילה
    const a = 52 - p * 150;
    const b = 80 - p * 120;
    word.style.setProperty("--fogA", a.toFixed(1) + "%");
    word.style.setProperty("--fogB", b.toFixed(1) + "%");
    word.style.opacity = (1 - clamp(p / 0.5, 0, 1)).toFixed(3);
    word.style.visibility = p >= 0.55 ? "hidden" : "visible";

    // "ברוכים הבאים" + תת-כותרת: דוהים פנימה (opacity) וגם עולים מעט מלמטה (נחשפים)
    if (welcome) {
      const wp = clamp((p - 0.5) / 0.4, 0, 1);
      welcome.style.opacity = wp.toFixed(3);
      welcome.style.transform = `translateY(${((1 - wp) * 26).toFixed(1)}px)`;
    }

    // הרמז "כדאי לגלול" נעלם ברגע שמתחילים לגלול
    if (hint) hint.style.opacity = (1 - clamp(p / 0.28, 0, 1)).toFixed(3);

    // שדה הסימבולים: מתגלה מלמטה כלפי מעלה (מתרבה/ממלא) + צבע משחור → בהיר מהרקע
    if (math) {
      math.style.setProperty("--mathReveal", Math.min(126, 30 + p * 100).toFixed(1) + "%");
      const l = (from, to) => Math.round(from + (to - from) * p);
      // גרדיאנט מתכתי כמו ה"3": למעלה בהיר (קבוע), למטה מתבהר מכהה(מסך 1)→אפור בהיר(מסך 2)
      math.style.setProperty("--mathTop", `rgb(${l(224, 226)}, ${l(228, 230)}, ${l(230, 232)})`);
      math.style.setProperty("--mathBot", `rgb(${l(150, 200)}, ${l(157, 205)}, ${l(161, 207)})`);
    }

    // שלושת הסימבולים שחפפו לטקסט (3/=/²): מוסתרים במסך 1, דוהים פנימה בגלילה
    const lateOp = clamp((p - 0.25) / 0.35, 0, 1).toFixed(3);
    for (let i = 0; i < lateSyms.length; i++) lateSyms[i].style.opacity = lateOp;
  }
  window.addEventListener(
    "scroll",
    () => {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(update);
      }
    },
    { passive: true }
  );
  window.addEventListener("resize", update, { passive: true });
  update();
})();

/* ============ פאנל "מה מקבלים" נכנס מלמעלה (במקום מלמטה) ============
   במקום לעלות מתחתית המסך, הוא יורד מהקצה העליון ומכסה את הפאנל שמתחתיו.
   נשען על offsetTop (לא מושפע מה-transform) כדי לחשב את התקדמות הכניסה. */
(function panelFromTop() {
  const panel = document.querySelector(".lpSection--alt");
  if (!panel) return;
  const reduce =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) return; // ללא תנועה — מתנהג כרגיל (sticky)

  let ticking = false;
  function update() {
    ticking = false;
    // מיקום ה"זרימה" של הפאנל ביחס לתצוגה (יציב, ללא תלות ב-transform)
    const naturalTop = panel.offsetTop - window.scrollY;
    // מראה ויזואלי = -naturalTop (מראָה): מתחיל מעל המסך ויורד עד 0; אחרי ההצמדה = 0
    panel.style.transform = `translateY(${(-2 * Math.max(0, naturalTop)).toFixed(1)}px)`;
  }
  window.addEventListener(
    "scroll",
    () => {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(update);
      }
    },
    { passive: true }
  );
  window.addEventListener("resize", update, { passive: true });
  update();
})();
