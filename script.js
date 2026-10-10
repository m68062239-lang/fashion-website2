/* FASHION. — shared script: cart, checkout (API), search, filters, header user */
(() => {
  const WHATSAPP_NUMBER = ""; // اختياري: رقم واتساب بصيغة دولية لإرسال تأكيد الطلب. مثال: 201012345678
  const STORAGE_KEY = "fashion_cart_v2";

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const fmt = (n) => n.toLocaleString("en-US") + " EGP";
  const esc = (s) =>
    String(s).replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  const JSON_POST = (body) => ({
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body || {}),
  });

  async function api(path, opts) {
    try {
      const r = await fetch("/api/" + path, {
        credentials: "same-origin",
        ...opts,
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

  // ====== State ======
  let cfg = { shippingFee: 50, freeFrom: 1000 }; // replaced by /api/config
  let me = null;
  let cart = [];
  try {
    cart = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    cart = [];
  }
  const save = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    } catch {}
  };
  const count = () => cart.reduce((n, i) => n + i.qty, 0);
  const subtotal = () => cart.reduce((n, i) => n + i.qty * i.price, 0);
  const shipping = () =>
    !cart.length || subtotal() >= cfg.freeFrom ? 0 : cfg.shippingFee;

  // ====== Inject drawer, search bar, toast ======
  document.body.insertAdjacentHTML(
    "beforeend",
    `
    <div class="overlay" id="overlay" hidden></div>
    <aside class="drawer" id="drawer" aria-label="Shopping cart" aria-hidden="true">
      <div class="drawer-head"><h2 id="drawerTitle">Your Cart</h2><button class="drawer-close" id="drawerClose" aria-label="Close">✕</button></div>
      <div class="drawer-list" id="drawerList"></div>
      <div class="drawer-foot" id="drawerFoot">
        <div class="ship" id="shipNote"></div>
        <div class="ship-bar"><i id="shipBar"></i></div>
        <div class="row"><span>Subtotal</span><span id="subTotal"></span></div>
        <div class="row"><span>Shipping</span><span id="shipCost"></span></div>
        <div class="sum"><span>Total</span><b id="cartTotal"></b></div>
        <button class="btn-primary checkout" id="checkout">Checkout</button>
        <button class="clear" id="clearCart">Clear cart</button>
      </div>
      <form class="co" id="coForm" hidden novalidate>
        <label>Phone<input name="phone" type="tel" autocomplete="tel" dir="ltr" placeholder="01XXXXXXXXX"></label>
        <label>Address<textarea name="address" rows="3" autocomplete="street-address" dir="auto" placeholder="المحافظة، المدينة، الشارع، رقم المبنى"></textarea></label>
        <label>Notes (optional)<input name="notes" dir="auto"></label>
        <div class="row"><span>Total</span><b id="coTotal"></b></div>
        <p class="co-msg" role="alert"></p>
        <button class="btn-primary checkout" type="submit">Place order</button>
        <button type="button" class="clear" id="coBack">← Back to cart</button>
      </form>
      <div class="done" id="coDone" hidden></div>
    </aside>
    <div class="toast" id="toast" role="status"></div>`,
  );
  $(".header").insertAdjacentHTML(
    "afterend",
    `
    <div class="searchbar" id="searchbar" hidden>
      <input id="searchInput" type="search" placeholder="Search products… ابحث عن منتج" autocomplete="off" dir="auto">
    </div>`,
  );

  const drawer = $("#drawer"),
    overlay = $("#overlay"),
    list = $("#drawerList"),
    foot = $("#drawerFoot"),
    coForm = $("#coForm"),
    coDone = $("#coDone");
  let panel = "cart";

  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("on");
    clearTimeout(toast.id);
    toast.id = setTimeout(() => t.classList.remove("on"), 2200);
  }
  function view(p) {
    panel = p;
    $("#drawerTitle").textContent =
      p === "form"
        ? "Delivery details"
        : p === "done"
          ? "Order placed"
          : "Your Cart";
    render();
  }
  function openCart() {
    drawer.classList.add("open");
    drawer.setAttribute("aria-hidden", "false");
    overlay.hidden = false;
    view("cart");
  }
  function closeCart() {
    drawer.classList.remove("open");
    drawer.setAttribute("aria-hidden", "true");
    overlay.hidden = true;
  }

  // ====== Render ======
  function render() {
    $$('.icon-btn[aria-label="Cart"]').forEach((btn) => {
      btn.classList.add("cart-btn");
      let b = $(".cart-count", btn);
      if (!b) {
        b = document.createElement("span");
        b.className = "cart-count";
        btn.appendChild(b);
      }
      b.textContent = count();
      b.classList.toggle("on", count() > 0);
    });
    list.hidden = panel !== "cart";
    foot.hidden = panel !== "cart" || !cart.length;
    coForm.hidden = panel !== "form";
    coDone.hidden = panel !== "done";
    if (panel !== "cart") {
      $("#coTotal").textContent = fmt(subtotal() + shipping());
      return;
    }

    if (!cart.length) {
      list.innerHTML = '<p class="empty" dir="rtl">السلة فاضية</p>';
      return;
    }
    list.innerHTML = cart
      .map(
        (i) => `
      <div class="line" data-id="${esc(i.id)}">
        <img src="${esc(i.img)}" alt="">
        <div class="info">
          <h4 dir="auto">${esc(i.name)}</h4>
          <span class="p">${fmt(i.price)}</span>
          <div class="qty"><button data-act="dec" aria-label="Decrease">−</button><span>${i.qty}</span><button data-act="inc" aria-label="Increase">+</button></div>
        </div>
        <button class="rm" data-act="rm" aria-label="Remove">🗑</button>
      </div>`,
      )
      .join("");
    const sub = subtotal(),
      left = cfg.freeFrom - sub;
    $("#subTotal").textContent = fmt(sub);
    $("#shipCost").textContent = shipping() ? fmt(shipping()) : "Free";
    $("#cartTotal").textContent = fmt(sub + shipping());
    $("#shipNote").textContent =
      left > 0
        ? `Add ${fmt(left)} more for free shipping`
        : "You've got free shipping 🎉";
    $("#shipBar").style.width = Math.min(100, (sub / cfg.freeFrom) * 100) + "%";
  }

  function add(p) {
    const f = cart.find((i) => i.id === p.id);
    f ? f.qty++ : cart.push({ ...p, qty: 1 });
    save();
    render();
    toast("Added to cart ✓");
  }

  // ====== Cart events ======
  list.addEventListener("click", (e) => {
    const b = e.target.closest("[data-act]");
    if (!b) return;
    const id = b.closest(".line").dataset.id,
      item = cart.find((i) => i.id === id);
    if (b.dataset.act === "inc") item.qty = Math.min(20, item.qty + 1);
    if (b.dataset.act === "dec") item.qty--;
    if (b.dataset.act === "rm" || item.qty < 1)
      cart = cart.filter((i) => i.id !== id);
    save();
    render();
  });
  $("#clearCart").onclick = () => {
    cart = [];
    save();
    render();
  };
  $("#drawerClose").onclick = closeCart;
  overlay.onclick = closeCart;
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeCart();
      $("#searchbar").hidden = true;
    }
  });
  $$('.icon-btn[aria-label="Cart"]').forEach((b) =>
    b.addEventListener("click", openCart),
  );

  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".add-to-cart-btn, .buy-btn");
    if (!btn) return;
    const card = btn.closest(".product-card, .product");
    if (!card || !card.dataset.id) return;
    const name = $("h3, h2", card).textContent.trim();
    const price = parseInt(
      $(".price", card).textContent.replace(/[^\d]/g, ""),
      10,
    );
    add({
      id: card.dataset.id,
      name,
      price,
      img: $("img", card).getAttribute("src"),
    });
  });

  // ====== Checkout ======
  $("#checkout").onclick = () => {
    if (!me) {
      const next = location.pathname.split("/").pop() || "index.html";
      location.href = "login.html?next=" + encodeURIComponent(next); // the cart is kept in the browser
      return;
    }
    view("form");
  };
  $("#coBack").onclick = () => view("cart");

  coForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = $(".co-msg", coForm),
      btn = $('button[type="submit"]', coForm);
    const f = Object.fromEntries(new FormData(coForm).entries());
    msg.textContent = "";
    if (!/^\+?[\d\s-]{8,16}$/.test((f.phone || "").trim())) {
      msg.textContent = "اكتب رقم موبايل صحيح";
      return;
    }
    if ((f.address || "").trim().length < 8) {
      msg.textContent = "اكتب العنوان بالتفصيل";
      return;
    }
    btn.disabled = true;
    const r = await api(
      "orders",
      JSON_POST({
        items: cart.map((i) => ({ id: i.id, qty: i.qty })),
        phone: f.phone,
        address: f.address,
        notes: f.notes,
      }),
    );
    btn.disabled = false;
    if (r.status === 401) {
      location.href =
        "login.html?next=" +
        encodeURIComponent(location.pathname.split("/").pop() || "index.html");
      return;
    }
    if (!r.ok) {
      msg.textContent =
        r.status === 0
          ? "السيرفر مش شغال — شغّله بـ node server.js"
          : r.data.message || "حصل خطأ، جرّب تاني";
      return;
    }
    const o = r.data.order;
    cart = [];
    save();
    coForm.reset();
    const wa = WHATSAPP_NUMBER
      ? `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("مرحبا، ده طلبي رقم " + o.id + " — الإجمالي " + fmt(o.total))}`
      : "";
    coDone.innerHTML = `
      <div class="ok-mark">✓</div>
      <h3 dir="rtl">تم استلام طلبك</h3>
      <p class="oid">${esc(o.id)}</p>
      <p class="muted">Total: ${fmt(o.total)}</p>
      <p class="muted" dir="rtl">هنتواصل معاك على ${esc(o.phone)} لتأكيد الطلب.</p>
      ${wa ? `<a class="btn-primary checkout" href="${esc(wa)}" target="_blank" rel="noopener">Send on WhatsApp</a>` : ""}
      <button class="clear" id="doneClose">Continue shopping</button>`;
    $("#doneClose").onclick = closeCart;
    view("done");
  });

  // ====== Search + category filter ======
  const state = { cat: "all", q: "" };
  const cards = $$(".product-card, .product");
  function applyFilters() {
    let n = 0;
    cards.forEach((c) => {
      const name = $("h3, h2", c).textContent.toLowerCase();
      const ok =
        (state.cat === "all" || c.dataset.cat === state.cat) &&
        name.includes(state.q);
      c.hidden = !ok;
      if (ok) n++;
    });
    const shown = $("#shown");
    if (shown) shown.textContent = n;
    const grid = cards[0] && cards[0].parentElement;
    let msg = $("#noResults");
    if (grid && !msg) {
      msg = document.createElement("p");
      msg.id = "noResults";
      msg.className = "no-results";
      msg.textContent = "No products found · مفيش نتايج";
      grid.after(msg);
    }
    if (msg) msg.hidden = n > 0;
  }
  $$(".chip").forEach((chip) =>
    chip.addEventListener("click", () => {
      $$(".chip").forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      state.cat = chip.dataset.filter;
      applyFilters();
    }),
  );
  $$('.icon-btn[aria-label="Search"]').forEach((b) =>
    b.addEventListener("click", () => {
      const bar = $("#searchbar");
      bar.hidden = !bar.hidden;
      if (!bar.hidden) $("#searchInput").focus();
    }),
  );
  $("#searchInput").addEventListener("input", (e) => {
    state.q = e.target.value.trim().toLowerCase();
    applyFilters();
  });

  // ====== Header: logged-in user ======
  function header() {
    const lb = $(".login-btn");
    if (!me || !lb) return;
    lb.textContent = "Logout · " + me.name.split(" ")[0];
    lb.href = "#";
    lb.addEventListener("click", async (e) => {
      e.preventDefault();
      await api("logout", JSON_POST());
      location.reload();
    });
    if (me.isAdmin && !$(".admin-link"))
      lb.insertAdjacentHTML(
        "beforebegin",
        '<a class="admin-link" href="admin.html">Orders</a>',
      );
  }

  render();
  api("config").then((r) => {
    if (r.ok) {
      cfg = r.data;
      render();
    }
  });
  api("me").then((r) => {
    me = r.ok ? r.data.user : null;
    header();
  });
})();
