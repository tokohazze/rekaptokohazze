// Toko Hazze — Tahap 7: Data Supplier (daftar, tambah, ubah, hapus, riwayat, dan supplier dari transaksi).
(function () {
  const CSS = `
  .toolbar{display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between;margin-bottom:14px}
  .toolbar input{flex:1;min-width:180px;padding:10px 14px;border:2px solid var(--blue);border-radius:14px;font:inherit;background:#fff}
  .form-card{margin-bottom:16px}
  .form-card h3{margin-bottom:10px}
  .f{display:block;margin-bottom:12px}
  .f span{display:block;font-size:14px;font-weight:700;margin-bottom:6px}
  .f input,.f textarea{width:100%;padding:10px 12px;border:2px solid var(--blue);border-radius:12px;font:inherit;background:#fff;color:var(--text)}
  .f textarea{min-height:70px;resize:vertical}
  .f input:focus,.f textarea:focus{outline:none;border-color:var(--pink-deep)}
  .grid{display:grid;gap:10px;grid-template-columns:1fr}
  @media (min-width:700px){.grid{grid-template-columns:1fr 1fr}}
  .cards{display:grid;gap:12px;grid-template-columns:1fr}
  @media (min-width:900px){.cards{grid-template-columns:1fr 1fr 1fr}}
  .sup{padding:16px}
  .sup-head{display:flex;align-items:center;gap:8px;margin-bottom:6px}
  .sup-head h3{margin:0;font-size:18px}
  .sup-meta{font-size:13px;color:var(--text-soft);margin-bottom:10px}
  .stats{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px}
  .stat{background:var(--cream);border-radius:12px;padding:8px 10px;font-size:12px;color:var(--text-soft)}
  .stat b{display:block;font-family:var(--font-body);font-size:16px;color:var(--text)}
  .note-txt{font-size:13px;background:var(--butter);border-radius:12px;padding:8px 10px;margin-bottom:10px}
  .actions{display:flex;flex-wrap:wrap;gap:6px}
  .chip{font:inherit;font-size:13px;font-weight:700;border:2px solid var(--blue);background:#fff;color:var(--text);border-radius:999px;padding:6px 12px;cursor:pointer}
  .chip.danger{border-color:#f7d1e8;color:#b4465f}
  .btn{font:inherit;font-weight:700;border:none;border-radius:999px;padding:10px 18px;cursor:pointer;background:var(--pink);color:var(--text);box-shadow:var(--shadow)}
  .btn-ghost{background:var(--white)}
  .btn:disabled{opacity:.6;cursor:wait}
  .form-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:6px}
  .unreg{margin-bottom:16px;background:var(--cream)}
  .unreg-row{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:8px 0;border-top:1px dashed #d3cbf3;flex-wrap:wrap}
  .err{color:#c0546f;font-size:14px;min-height:18px;margin:6px 0 0}
  .ok{color:var(--green-deep);font-weight:700;margin:0 0 12px}
  .muted{color:var(--text-soft);font-size:14px}
  .note{text-align:center;padding:24px}
  .overlay{position:fixed;inset:0;background:rgba(114,36,110,.35);display:grid;place-items:center;padding:16px;z-index:50}
  .modal{background:var(--white);border-radius:24px;padding:20px;max-width:560px;width:100%;max-height:88vh;overflow:auto;box-shadow:var(--shadow);border:2px dashed var(--pink)}
  .tbl-box{position:relative;margin-top:16px;padding-top:6px}
  .tbl-box::before{content:"";position:absolute;top:-2px;left:50%;width:92px;height:20px;margin-left:-46px;background:rgba(177,229,219,.85);transform:rotate(-2deg);border-radius:4px;z-index:1}
  .hist{width:100%;border-collapse:separate;border-spacing:0;font-size:13px;background:#fff;border:2px dashed #d3cbf3;border-radius:18px;overflow:hidden;box-shadow:0 7px 0 rgba(104,80,63,.14),0 14px 22px rgba(104,80,63,.14)}
  .hist th{background:var(--pink);color:var(--text);font-weight:400;text-align:left;padding:10px;white-space:nowrap}
  .hist td{text-align:left;padding:9px 10px;border-top:1px dashed #d3cbf3;vertical-align:top}
  .hist tbody tr:nth-child(even) td{background:rgba(177,229,219,.18)}
  .hist tbody tr:hover td{background:rgba(247,209,232,.35)}
  `;

  const state = {
    container: null,
    suppliers: [],
    orders: [],
    search: "",
    formOpen: false,
    editingId: null,
    prefill: null,
    msg: "",
    busy: false
  };

  const sb = () => window.hazzeSb;
  const pad = (n) => String(n).padStart(2, "0");
  const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parseISO = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
  const fmtRp = (n) => "Rp " + Math.round(Number(n) || 0).toLocaleString("id-ID");
  const fmtDate = (s) => (s ? parseISO(s).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "-");
  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const norm = (s) => String(s || "").trim().toLowerCase();

  // ---------- Data ----------
  // Transaksi menyimpan nama supplier sebagai salinan. Mengubah data supplier tidak mengubah transaksi lama.
  async function loadAll() {
    const [s, o] = await Promise.all([
      sb().from("suppliers").select("*").order("name", { ascending: true }),
      sb().from("orders")
        .select("id,transaction_id,order_date,app_name,variant,duration,supplier_name,total_cost,work_status,customers(name)")
        .neq("work_status", "Dibatalkan")
    ]);
    if (s.error) throw s.error;
    if (o.error) throw o.error;
    state.suppliers = s.data || [];
    state.orders = o.data || [];
  }

  function statsFor(name) {
    const key = norm(name);
    const list = state.orders.filter((x) => norm(x.supplier_name) === key);
    const total = list.reduce((a, x) => a + (Number(x.total_cost) || 0), 0);
    return { count: list.length, total, list };
  }

  // Nama supplier yang pernah dipakai di transaksi tetapi belum punya data supplier.
  function unregistered() {
    const have = new Set(state.suppliers.map((s) => norm(s.name)));
    const names = new Map();
    state.orders.forEach((x) => {
      const n = (x.supplier_name || "").trim();
      if (n && !have.has(norm(n))) names.set(norm(n), n);
    });
    return [...names.values()].sort((a, b) => a.localeCompare(b, "id"));
  }

  // ---------- Tampilan ----------
  function formHtml() {
    const editing = state.suppliers.find((s) => s.id === state.editingId);
    const v = editing || state.prefill || { name: "", contact: "", platform: "", note: "" };
    return `
      <form id="sup-form" class="card form-card">
        <h3>${editing ? "Ubah Supplier" : "Tambah Supplier"}</h3>
        <div class="grid">
          <label class="f"><span>Nama supplier / admin</span>
            <input name="name" required value="${esc(v.name)}" placeholder="contoh: Admin Bella" /></label>
          <label class="f"><span>Kontak (nomor HP atau WhatsApp)</span>
            <input name="contact" value="${esc(v.contact || "")}" /></label>
          <label class="f"><span>Username atau platform</span>
            <input name="platform" value="${esc(v.platform || "")}" placeholder="contoh: @bella_shop / Telegram" /></label>
        </div>
        <label class="f"><span>Keterangan dan catatan (opsional)</span>
          <textarea name="note">${esc(v.note || "")}</textarea></label>
        <div class="form-actions">
          <button class="btn" type="submit">${editing ? "Simpan Perubahan" : "Simpan Supplier"}</button>
          <button class="btn btn-ghost" type="button" id="btn-cancel">Batal</button>
        </div>
        <p class="err" id="form-error"></p>
      </form>`;
  }

  function supplierCard(s) {
    const st = statsFor(s.name);
    return `
      <div class="card sup">
        <div class="sup-head"><span>🌷</span><h3>${esc(s.name)}</h3></div>
        <div class="sup-meta">
          ${s.contact ? `Kontak: ${esc(s.contact)}` : "Kontak: -"}
          ${s.platform ? ` · ${esc(s.platform)}` : ""}
        </div>
        <div class="stats">
          <div class="stat">Jumlah order<b>${st.count}</b></div>
          <div class="stat">Total modal<b>${fmtRp(st.total)}</b></div>
        </div>
        ${s.note ? `<div class="note-txt">${esc(s.note)}</div>` : ""}
        <div class="actions">
          <button class="chip" data-act="history" data-id="${s.id}">Lihat Riwayat</button>
          <button class="chip" data-act="edit" data-id="${s.id}">Ubah</button>
          <button class="chip danger" data-act="delete" data-id="${s.id}">Hapus</button>
        </div>
      </div>`;
  }

  function render() {
    const c = state.container;
    if (!c) return;
    const q = norm(state.search);
    const list = state.suppliers.filter((s) =>
      !q || [s.name, s.contact, s.platform].some((v) => norm(v).includes(q)));
    const unreg = unregistered();

    c.innerHTML = `
      ${state.msg ? `<p class="ok">${esc(state.msg)}</p>` : ""}
      <div class="toolbar">
        <input id="sup-search" type="search" placeholder="Cari nama, kontak, atau platform" value="${esc(state.search)}" />
        <button class="btn" id="btn-new" type="button">+ Tambah Supplier</button>
      </div>
      ${state.formOpen ? formHtml() : ""}
      ${unreg.length ? `
      <div class="card unreg">
        <b>Belum terdaftar</b>
        <p class="muted" style="margin:4px 0 0">Nama ini pernah dipakai di transaksi, tetapi belum punya data supplier.</p>
        ${unreg.map((n) => `
          <div class="unreg-row">
            <span>${esc(n)}</span>
            <button class="chip" data-reg="${esc(n)}" type="button">Daftarkan</button>
          </div>`).join("")}
      </div>` : ""}
      ${list.length === 0
        ? `<div class="card note"><div>✿ ❀ ✿</div><p class="muted">${state.suppliers.length === 0
            ? "Belum ada supplier. Tambahkan supplier pertama Anda."
            : "Tidak ada supplier yang cocok dengan pencarian."}</p></div>`
        : `<div class="cards">${list.map(supplierCard).join("")}</div>`}
      <div id="modal-root"></div>`;
    state.msg = "";
  }

  function renderHistory(id) {
    const s = state.suppliers.find((x) => x.id === id);
    if (!s) return "";
    const st = statsFor(s.name);
    const rows = st.list.slice().sort((a, b) => (b.order_date || "").localeCompare(a.order_date || ""));
    return `
      <div class="overlay" data-overlay>
        <div class="modal" role="dialog">
          <h3>Riwayat: ${esc(s.name)}</h3>
          <p class="muted" style="margin-top:-4px">${st.count} transaksi · total modal ${fmtRp(st.total)}</p>
          ${rows.length === 0 ? `<p class="muted">Belum ada transaksi dari supplier ini.</p>` : `
          <div class="tbl-box"><table class="hist">
            <thead><tr><th>Tanggal</th><th>ID</th><th>Customer</th><th>Aplikasi</th><th>Modal</th></tr></thead>
            <tbody>
              ${rows.map((x) => `<tr>
                <td>${fmtDate(x.order_date)}</td>
                <td>${esc(x.transaction_id)}</td>
                <td>${esc(x.customers?.name || "-")}</td>
                <td>${esc(x.app_name)} ${esc(x.duration)}</td>
                <td>${fmtRp(x.total_cost)}</td>
              </tr>`).join("")}
            </tbody>
          </table></div>`}
          <div class="form-actions"><button class="btn btn-ghost" type="button" data-close>Tutup</button></div>
        </div>
      </div>`;
  }

  // ---------- Aksi ----------
  async function onSubmit(e) {
    if (e.target.id !== "sup-form") return;
    e.preventDefault();
    if (state.busy) return;
    const f = e.target;
    const err = f.querySelector("#form-error");
    err.textContent = "";
    const name = f.elements.name.value.trim();
    if (!name) { err.textContent = "Nama supplier wajib diisi."; return; }

    const payload = {
      name,
      contact: f.elements.contact.value.trim() || null,
      platform: f.elements.platform.value.trim() || null,
      note: f.elements.note.value.trim() || null
    };
    const dup = state.suppliers.find((s) => norm(s.name) === norm(name) && s.id !== state.editingId);
    if (dup) { err.textContent = "Sudah ada supplier dengan nama ini."; return; }

    const btn = f.querySelector("button[type=submit]");
    state.busy = true;
    btn.disabled = true;
    const req = state.editingId
      ? sb().from("suppliers").update(payload).eq("id", state.editingId)
      : sb().from("suppliers").insert(payload);
    const { error } = await req;
    state.busy = false;
    btn.disabled = false;
    if (error) { err.textContent = "Gagal menyimpan: " + error.message; return; }

    state.msg = state.editingId ? "Data supplier diperbarui ✿" : "Supplier tersimpan ✿";
    state.formOpen = false;
    state.editingId = null;
    state.prefill = null;
    await loadAll();
    render();
  }

  async function removeSupplier(id) {
    const s = state.suppliers.find((x) => x.id === id);
    if (!s) return;
    const st = statsFor(s.name);
    const ok = confirm(`Hapus supplier "${s.name}"?\n${st.count} transaksi lama tetap menyimpan nama supplier ini.`);
    if (!ok) return;
    const { error } = await sb().from("suppliers").delete().eq("id", id);
    if (error) { alert("Gagal menghapus: " + error.message); return; }
    state.msg = "Supplier dihapus.";
    await loadAll();
    render();
  }

  function onClick(e) {
    const t = e.target;
    if (t.closest("#btn-new")) { state.editingId = null; state.prefill = null; state.formOpen = true; render(); return; }
    if (t.closest("#btn-cancel")) { state.formOpen = false; state.editingId = null; state.prefill = null; render(); return; }

    const reg = t.closest("[data-reg]");
    if (reg) {
      state.editingId = null;
      state.prefill = { name: reg.dataset.reg };
      state.formOpen = true;
      render();
      state.container.querySelector("#sup-form")?.scrollIntoView({ behavior: "smooth" });
      return;
    }

    const btn = t.closest("[data-act]");
    if (btn) {
      const id = btn.dataset.id;
      const act = btn.dataset.act;
      if (act === "edit") {
        state.editingId = id; state.prefill = null; state.formOpen = true; render();
        state.container.querySelector("#sup-form")?.scrollIntoView({ behavior: "smooth" });
      } else if (act === "delete") {
        removeSupplier(id);
      } else if (act === "history") {
        const modal = state.container.querySelector("#modal-root");
        modal.innerHTML = renderHistory(id);
      }
      return;
    }

    const closer = t.closest("[data-close]");
    if (closer) {
      if (closer.hasAttribute("data-overlay") && t.closest(".modal")) return;
      state.container.querySelector("#modal-root").innerHTML = "";
    }
  }

  function onInput(e) {
    if (e.target.id === "sup-search") {
      state.search = e.target.value;
      render();
      const el = state.container.querySelector("#sup-search");
      if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
    }
  }

  // ---------- Entry point ----------
  function injectStyle() {
    if (document.getElementById("sup-style")) return;
    const s = document.createElement("style");
    s.id = "sup-style";
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  window.renderSupplier = function (container) {
    injectStyle();
    state.container = container;
    state.formOpen = false;
    state.editingId = null;
    state.prefill = null;
    if (!container.dataset.supBound) {
      container.addEventListener("click", onClick);
      container.addEventListener("input", onInput);
      container.addEventListener("submit", onSubmit);
      container.dataset.supBound = "1";
    }
    container.innerHTML = `<p class="muted note">Memuat supplier...</p>`;
    loadAll()
      .then(render)
      .catch((err) => {
        container.innerHTML = `<div class="card note"><p>Data supplier belum bisa dimuat.</p>
          <p class="muted">${esc(err.message || err)}</p></div>`;
      });
  };
})();
