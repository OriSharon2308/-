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

/* ============ סצנת גלילה ל-hero: התוכן עולה מלמטה למרכז + הערפל ממלא את הרקע ============ */
(function heroScene() {
  const word = document.querySelector(".lpHero__word");
  const veil = document.querySelector(".lpHero__veil");
  const content = document.getElementById("heroContent");
  if (!word || !content) return;
  const reduce =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  let ticking = false;
  function update() {
    ticking = false;
    const vh = window.innerHeight || 1;
    const p = clamp(window.scrollY / vh, 0, 1); // ביט ה-hero לאורך מסך אחד

    // שלב 1 (0→0.62): התוכן עולה מהתחתית למרכז
    const riseP = clamp(p / 0.62, 0, 1);
    const startLow = 0.42 * vh; // מתחיל ~42% מתחת למרכז (קרוב לתחתית)
    if (!reduce) content.style.transform = `translateY(${((1 - riseP) * startLow).toFixed(1)}px)`;

    // הערפל עולה לאורך כל הביט; מסכת ה-vela עולה והאותיות מתמוססות
    const a = 26 - p * 96; // 26% → -70%
    const b = 62 - p * 70; // 62% → -8%
    word.style.setProperty("--fogA", a.toFixed(1) + "%");
    word.style.setProperty("--fogB", b.toFixed(1) + "%");

    // שלב 2 (0.55→1): הערפל "ממלא" את הרקע (הצעיף נכנס) וה-vela דוהה לגמרי
    if (veil) veil.style.opacity = clamp((p - 0.55) / 0.45, 0, 1).toFixed(3);
    word.style.opacity = (1 - clamp((p - 0.4) / 0.6, 0, 1)).toFixed(3);
    word.style.visibility = p >= 1 ? "hidden" : "visible";
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
