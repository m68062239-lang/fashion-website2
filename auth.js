/* FASHION. — login / signup via the backend API */
(() => {
  const form = document.getElementById("authForm");
  if (!form) return;
  const mode = form.dataset.auth;
  const msg = form.querySelector(".form-msg");
  const btn = form.querySelector('button[type="submit"]');

  const say = (text, ok) => {
    msg.textContent = text;
    msg.className = "form-msg " + (ok ? "ok" : "bad");
  };
  const setErr = (name, text) => {
    const input = form.elements[name];
    if (!input) return;
    input.closest(".field").querySelector(".err").textContent = text || "";
    input.setAttribute("aria-invalid", text ? "true" : "false");
  };
  async function api(path, body) {
    try {
      const r = await fetch("/api/" + path, {
        method: body ? "POST" : "GET",
        credentials: "same-origin",
        headers: body ? { "Content-Type": "application/json" } : {},
        body: body ? JSON.stringify(body) : undefined,
      });
      let data = {};
      try {
        data = await r.json();
      } catch {}
      return { ok: r.ok, status: r.status, data };
    } catch {
      return { ok: false, status: 0, data: {} };
    }
  }
  // only same-site .html pages are allowed as redirect target
  const next = (() => {
    const n = new URLSearchParams(location.search).get("next");
    return /^[\w-]+\.html$/i.test(n || "") ? n : "index.html";
  })();

  if (location.protocol === "file:") {
    say(
      "افتح الموقع من السيرفر: شغّل node server.js وبعدها http://localhost:3000",
      false,
    );
  }
  api("me").then((r) => {
    if (r.ok && r.data.user) location.replace(next);
  });

  form.querySelectorAll("[data-toggle]").forEach((t) =>
    t.addEventListener("click", () => {
      const i = form.elements[t.dataset.toggle];
      const show = i.type === "password";
      i.type = show ? "text" : "password";
      t.textContent = show ? "Hide" : "Show";
    }),
  );
  form.querySelectorAll("input").forEach((el) =>
    el.addEventListener("input", () => {
      setErr(el.name, "");
      msg.textContent = "";
    }),
  );

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    say("");
    const v = Object.fromEntries(new FormData(form).entries());
    const name = (v.name || "").trim(),
      email = (v.email || "").trim().toLowerCase(),
      pw = v.password || "";
    let bad = false;
    if (mode === "signup" && name.length < 2) {
      setErr("name", "اكتب اسمك (حرفين على الأقل)");
      bad = true;
    }
    if (!EMAIL_RE.test(email)) {
      setErr("email", "اكتب إيميل صحيح");
      bad = true;
    }
    if (mode === "signup") {
      if (
        pw.length < 6 ||
        !/\d/.test(pw) ||
        !/[A-Za-z\u0600-\u06FF]/.test(pw)
      ) {
        setErr("password", "كلمة السر 6 حروف على الأقل وفيها حروف وأرقام");
        bad = true;
      }
      if (v.confirm !== pw) {
        setErr("confirm", "كلمتين السر مش متطابقين");
        bad = true;
      }
    } else if (!pw) {
      setErr("password", "اكتب كلمة السر");
      bad = true;
    }
    if (bad) return;

    btn.disabled = true;
    const r = await api(
      mode,
      mode === "signup"
        ? { name, email, password: pw }
        : { email, password: pw },
    );
    btn.disabled = false;
    if (r.ok) {
      say(
        mode === "signup"
          ? "تم إنشاء الحساب ✓ جاري التحويل…"
          : "أهلاً " + r.data.user.name + " ✓",
        true,
      );
      setTimeout(() => (location.href = next), 700);
    } else if (r.status === 0) {
      say(
        "السيرفر مش شغال — شغّله بـ node server.js وافتح http://localhost:3000",
        false,
      );
    } else if (r.data.field) {
      setErr(r.data.field, r.data.message);
    } else {
      say(r.data.message || "حصل خطأ، جرّب تاني", false);
    }
  });
})();
