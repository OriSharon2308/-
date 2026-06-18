/* ============ לוגיקת הטפסים (כניסה / הרשמה) ============ */
(function () {
  const tabLogin = document.getElementById("tabLogin");
  const tabRegister = document.getElementById("tabRegister");
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");
  const errorBox = document.getElementById("authError");
  const tabIndicator = document.querySelector(".authTabs__indicator");

  // ממקם את הפס המחליק מתחת לטאב הפעיל
  function moveIndicator(tab, instant) {
    if (!tabIndicator || !tab) return;
    if (instant) tabIndicator.style.transition = "none";
    tabIndicator.style.width = `${tab.offsetWidth}px`;
    tabIndicator.style.transform = `translateX(${tab.offsetLeft}px)`;
    if (instant) {
      void tabIndicator.offsetWidth; // reflow כדי שהמעבר לא יקפוץ
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

  const authForms = document.getElementById("authForms");
  let animating = false;

  function selectTab(which) {
    const login = which === "login";
    const showForm = login ? loginForm : registerForm;
    const hideForm = login ? registerForm : loginForm;
    if (!showForm.hidden || animating) return; // כבר פעיל, או באמצע אנימציה

    clearError();
    tabLogin.classList.toggle("authTab--active", login);
    tabRegister.classList.toggle("authTab--active", !login);
    moveIndicator(login ? tabLogin : tabRegister, false);

    const reduce =
      window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      hideForm.hidden = true;
      showForm.hidden = false;
      return;
    }

    animating = true;
    const startH = authForms.offsetHeight;

    hideForm.classList.add("authForm--leaving");
    showForm.hidden = false;
    showForm.classList.add("authForm--entering");

    const endH = authForms.offsetHeight;
    authForms.style.height = `${startH}px`;
    void authForms.offsetHeight; // reflow
    authForms.style.height = `${endH}px`;

    requestAnimationFrame(() => showForm.classList.remove("authForm--entering"));

    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      hideForm.hidden = true;
      hideForm.classList.remove("authForm--leaving");
      authForms.style.height = "";
      animating = false;
      authForms.removeEventListener("transitionend", onEnd);
    };
    const onEnd = (e) => {
      if (e.target === authForms && e.propertyName === "height") finish();
    };
    authForms.addEventListener("transitionend", onEnd);
    window.setTimeout(finish, 650); // גיבוי אם transitionend לא נורה
  }

  tabLogin.addEventListener("click", () => selectTab("login"));
  tabRegister.addEventListener("click", () => selectTab("register"));

  moveIndicator(tabLogin, true);
  window.addEventListener("load", () =>
    moveIndicator(document.querySelector(".authTab--active") || tabLogin, true)
  );
  window.addEventListener("resize", () =>
    moveIndicator(document.querySelector(".authTab--active") || tabLogin, true)
  );

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

  // בחירת בן/בת בכפתורי תמונה — מעדכן את השדה המוסתר ומסמן את הנבחר
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
