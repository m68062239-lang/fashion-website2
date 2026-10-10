(() => {
  const STATUSES = ["new", "confirmed", "shipped", "delivered", "cancelled"];
  const note = document.getElementById("status"),
    tbl = document.getElementById("tbl"),
    rows = document.getElementById("rows");
  const el = (tag, text, cls) => {
    const e = document.createElement(tag);
    if (text !== undefined) e.textContent = text;
    if (cls) e.className = cls;
    return e;
  };
  const fmt = (n) => n.toLocaleString("en-US") + " EGP";

  async function load() {
    let r;
    try {
      r = await fetch("/api/admin/orders", { credentials: "same-origin" });
    } catch {
      note.textContent = "السيرفر مش شغال.";
      return;
    }
    if (r.status === 401) {
      note.textContent = "";
      const a = el("a", "Login as admin");
      a.href = "login.html?next=admin.html";
      note.append(a);
      return;
    }
    if (r.status === 403) {
      note.textContent =
        "الحساب ده مش أدمن. حط إيميلك في ADMIN_EMAIL وشغّل السيرفر تاني.";
      return;
    }
    const { orders } = await r.json();
    note.textContent = orders.length
      ? orders.length + " orders"
      : "مفيش طلبات لسه.";
    tbl.hidden = !orders.length;
    rows.replaceChildren();
    for (const o of orders) {
      const tr = el("tr");
      tr.append(
        el("td", o.id, "id"),
        el("td", new Date(o.createdAt).toLocaleString()),
      );
      const c = el("td");
      c.append(
        el("b", o.name),
        el("br"),
        el("span", o.email, "muted"),
        el("br"),
        el("span", o.phone, "muted"),
      );
      tr.append(c);
      const d = el("td");
      d.append(el("span", o.address));
      if (o.notes) {
        d.append(el("br"), el("em", "Note: " + o.notes, "muted"));
      }
      tr.append(d);
      const it = el("td");
      o.items.forEach((i) => it.append(el("div", `${i.name} × ${i.qty}`)));
      tr.append(it);
      const t = el("td");
      t.append(el("b", fmt(o.total)));
      if (o.shipping)
        t.append(
          el("br"),
          el("span", "incl. shipping " + fmt(o.shipping), "muted"),
        );
      tr.append(t);
      const s = el("td"),
        sel = el("select");
      STATUSES.forEach((x) => {
        const op = el("option", x);
        op.value = x;
        if (x === o.status) op.selected = true;
        sel.append(op);
      });
      sel.className = "st st-" + o.status;
      sel.addEventListener("change", async () => {
        const res = await fetch("/api/admin/orders/" + o.id, {
          method: "PATCH",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: sel.value }),
        });
        if (res.ok) sel.className = "st st-" + sel.value;
        else {
          sel.value = o.status;
          alert("فشل تحديث الحالة");
        }
      });
      s.append(sel);
      tr.append(s);
      rows.append(tr);
    }
  }
  load();
})();
