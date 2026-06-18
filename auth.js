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

  // בלחיצה על אחד הכפתורים — נפתח רק הטופס שלו (השני נסגר)
  function selectTab(which) {
    const login = which === "login";
    const showForm = login ? loginForm : registerForm;
    const hideForm = login ? registerForm : loginForm;
    clearError();
    tabLogin.classList.toggle("authTab--active", login);
    tabRegister.classList.toggle("authTab--active", !login);
    if (tabIndicator) tabIndicator.style.opacity = "1";
    moveIndicator(login ? tabLogin : tabRegister, false);

    hideForm.hidden = true;
    hideForm.classList.remove("authForm--in");
    if (showForm.hidden) {
      showForm.hidden = false;
      showForm.classList.remove("authForm--in");
      void showForm.offsetWidth;
      showForm.classList.add("authForm--in");
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
