/* ============ parallax עדין — VELA ברקע זז מעט עם העכבר ============ */
(function parallax() {
  const bg = document.querySelector(".authWord");
  if (!bg) return;
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const MAX = 18;
  let tx = 0;
  let ty = 0;
  let cx = 0;
  let cy = 0;
  window.addEventListener("pointermove", (e) => {
    tx = -(e.clientX / window.innerWidth - 0.5) * MAX;
    ty = -(e.clientY / window.innerHeight - 0.5) * MAX;
  });
  (function tick() {
    cx += (tx - cx) * 0.15;
    cy += (ty - cy) * 0.15;
    bg.style.setProperty("--px", `${cx.toFixed(2)}px`);
    bg.style.setProperty("--py", `${cy.toFixed(2)}px`);
    requestAnimationFrame(tick);
  })();
})();

/* ============ אפקט spotlight: זוהר שעוקב אחרי העכבר על הכרטיס ============ */
(function spotlight() {
  const card = document.querySelector(".authCard");
  if (!card) return;
  card.addEventListener("pointermove", (e) => {
    const rect = card.getBoundingClientRect();
    card.style.setProperty("--mx", `${e.clientX - rect.left}px`);
    card.style.setProperty("--my", `${e.clientY - rect.top}px`);
    card.classList.add("is-hover");
  });
  card.addEventListener("pointerleave", () => card.classList.remove("is-hover"));
})();

/* ============ אפקט ניצוצות שעוקב אחרי העכבר ============ */
(function sparkles() {
  const reduce =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) return;

  const canvas = document.createElement("canvas");
  canvas.className = "sparkleCanvas";
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");

  let w = 0;
  let h = 0;
  let dpr = 1;
  function resize() {
    w = window.innerWidth;
    h = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener("resize", resize);

  const parts = [];
  const colors = ["#0d9488", "#14b8a6", "#fbbf24", "#818cf8"];
  let lastX = 0;
  let lastY = 0;
  let lastSpawn = 0;

  function spawn(x, y, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = Math.random() * 0.6 + 0.1;
      parts.push({
        x: x + (Math.random() - 0.5) * 18,
        y: y + (Math.random() - 0.5) * 18,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 0.25,
        r: Math.random() * 5 + 2,
        life: 1,
        decay: Math.random() * 0.012 + 0.01,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.12,
        tw: Math.random() * Math.PI * 2,
        color: colors[(Math.random() * colors.length) | 0],
      });
    }
    if (parts.length > 260) parts.splice(0, parts.length - 260);
  }

  window.addEventListener("pointermove", (e) => {
    const now = performance.now();
    const dist = Math.hypot(e.clientX - lastX, e.clientY - lastY);
    lastX = e.clientX;
    lastY = e.clientY;
    if (now - lastSpawn < 16) return;
    lastSpawn = now;
    const n = dist > 40 ? 3 : dist > 8 ? 2 : 1;
    spawn(e.clientX, e.clientY, n);
  });

  function star(x, y, r, alpha, rot, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = r * 2.5;
    const spikes = 4;
    const inner = r * 0.38;
    ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
      const rad = i % 2 === 0 ? r : inner;
      const a = (Math.PI / spikes) * i - Math.PI / 2;
      const px = Math.cos(a) * rad;
      const py = Math.sin(a) * rad;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function frame() {
    ctx.clearRect(0, 0, w, h);
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.004;
      p.rot += p.vr;
      p.tw += 0.2;
      p.life -= p.decay;
      if (p.life <= 0) {
        parts.splice(i, 1);
        continue;
      }
      const twinkle = 0.6 + 0.4 * Math.sin(p.tw);
      star(p.x, p.y, p.r * p.life * twinkle + 0.5, p.life * twinkle, p.rot, p.color);
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();

/* ============ לוגיקת הטפסים ============ */
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

    // הטופס היוצא — מוצא מהזרימה ונמוג
    hideForm.classList.add("authForm--leaving");
    // הטופס הנכנס — מוצג, מתחיל שקוף
    showForm.hidden = false;
    showForm.classList.add("authForm--entering");

    const endH = authForms.offsetHeight; // גובה היעד (רק הנכנס בזרימה)
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

  // מיקום התחלתי (בלי אנימציה) + עדכון בטעינת הפונט ובשינוי גודל
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
