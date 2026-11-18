// Toko Hazze — Tahap 3: Pengelolaan produk dan daftar harga.
(function () {
  const CSS = `
  .toolbar{display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between;margin-bottom:16px}
  .toggle{font-size:14px;display:flex;gap:6px;align-items:center;cursor:pointer}
  .form-card{margin-bottom:16px}
  .form-card h3{margin-bottom:12px}
  .f{display:block;margin-bottom:12px}
  .f span{display:block;font-size:14px;font-weight:700;margin-bottom:6px}
  .f input,.f select{width:100%;padding:10px 12px;border:2px solid var(--blue);border-radius:12px;font:inherit;background:#fff;color:var(--text)}
  .f input:focus,.f select:focus{outline:none;border-color:var(--pink-deep)}
  .form-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:6px}
  .app-card{margin-bottom:14px}
  .app-head{display:flex;align-items:center;gap:8px;margin-bottom:10px}
  .app-head h3{margin:0}
  .row{display:flex;flex-wrap:wrap;gap:10px;justify-content:space-between;align-items:center;padding:12px;border-radius:14px;background:var(--cream);margin-bottom:8px}
  .row.archived{opacity:.6}
  .row-info{font-size:14px}
  .price{font-family:var(--font-body);font-size:18px;color:var(--pink-deep);margin-top:2px}
  .tag{display:inline-block;font-size:11px;font-weight:700;background:var(--butter);border-radius:999px;padding:2px 8px;margin-top:4px}
  .row-actions{display:flex;gap:6px;flex-wrap:wrap}
  .chip{font:inherit;font-size:13px;font-weight:700;border:2px solid var(--blue);background:#fff;color:var(--text);border-radius:999px;padding:6px 12px;cursor:pointer}
  .chip.danger{border-color:#f7d1e8;color:#b4465f}
  .btn{font:inherit;font-weight:700;border:none;border-radius:999px;padding:10px 18px;cursor:pointer;background:var(--pink);color:var(--text);box-shadow:var(--shadow)}
  .btn:disabled{opacity:.6;cursor:wait}
  .btn-ghost{background:var(--white)}
  .err{color:#c0546f;font-size:14px;min-height:18px;margin:6px 0 0}
  .ok{color:var(--green-deep);font-weight:700;margin:0 0 10px}
  .muted{color:var(--text-soft);font-size:14px}
  .note{text-align:center;margin-top:10px}
  `;

  const DURASI = ["7 hari", "15 hari", "30 hari", "1 bulan", "3 bulan", "6 bulan", "1 tahun"];

  const state = {
    container: null,
    products: [],
    showArchived: false,
    formOpen: false,
    editingId: null,
    msg: ""
  };

  const sb = () => window.hazzeSb;
  const fmtRp = (n) => "Rp " + Math.round(Number(n) || 0).toLocaleString("id-ID");
  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // ---------- Data ----------
  async function load() {
    const { data, error } = await sb()
      .from("products")
      .select("*")
      .order("app_name", { ascending: true })
      .order("sell_price", { ascending: true });
    if (error) throw error;
    state.products = data || [];
  }

  // ---------- Tampilan ----------
  function formHtml(names) {
    const editing = state.products.find((p) => p.id === state.editingId);
    const v = editing || { app_name: "", variant: "", duration: "30 hari", sell_price: "" };
    const isCustom = v.duration && !DURASI.includes(v.duration);
    return `
      <form id="prod-form" class="card form-card">
        <h3>${editing ? "Ubah Produk" : "Tambah Produk"}</h3>

        <label class="f">
          <span>Nama aplikasi</span>
          <input name="app_name" list="app-list" required value="${esc(v.app_name)}" placeholder="contoh: Netflix" />
          <datalist id="app-list">${names.map((n) => `<option value="${esc(n)}">`).join("")}</datalist>
        </label>

        <label class="f">
          <span>Varian (boleh kosong)</span>
          <input name="variant" value="${esc(v.variant)}" placeholder="contoh: Sharing atau Private" />
        </label>

        <label class="f">
          <span>Durasi</span>
          <select name="duration_pick">
            ${DURASI.map((d) => `<option ${d === v.duration ? "selected" : ""}>${d}</option>`).join("")}
            <option value="__custom" ${isCustom ? "selected" : ""}>Durasi khusus</option>
          </select>
        </label>

        <label class="f" id="custom-wrap" ${isCustom ? "" : "hidden"}>
          <span>Tulis durasi</span>
          <input name="duration_custom" value="${isCustom ? esc(v.duration) : ""}" placeholder="contoh: 2 minggu" />
        </label>

        <label class="f">
          <span>Harga jual per unit (Rp)</span>
          <input name="sell_price" type="number" min="0" step="500" required value="${v.sell_price ?? ""}" />
        </label>

        <div class="form-actions">
          <button class="btn" type="submit">${editing ? "Simpan Perubahan" : "Simpan Produk"}</button>
          <button class="btn btn-ghost" type="button" id="btn-cancel">Batal</button>
        </div>
        <p id="form-error" class="err"></p>
      </form>`;
  }

  function appCard(app, items) {
    return `
      <div class="card app-card">
        <div class="app-head"><span>🌸</span><h3>${esc(app)}</h3></div>
        ${items.map((p) => `
          <div class="row ${p.is_archived ? "archived" : ""}">
            <div class="row-info">
              <b>${esc(p.variant || "Standar")}</b> · ${esc(p.duration)}
              <div class="price">${fmtRp(p.sell_price)}</div>
              ${p.is_archived ? '<span class="tag">Diarsipkan</span>' : ""}
            </div>
            <div class="row-actions">
              <button class="chip" data-edit="${p.id}">Ubah</button>
              <button class="chip" data-archive="${p.id}">${p.is_archived ? "Aktifkan" : "Arsipkan"}</button>
              <button class="chip danger" data-del="${p.id}">Hapus</button>
            </div>
          </div>`).join("")}
      </div>`;
  }

  function render() {
    const c = state.container;
    if (!c) return;
    const list = state.products.filter((p) => state.showArchived || !p.is_archived);
    const groups = {};
    list.forEach((p) => { (groups[p.app_name] = groups[p.app_name] || []).push(p); });
    const apps = Object.keys(groups).sort((a, b) => a.localeCompare(b, "id"));
    const names = [...new Set(state.products.map((p) => p.app_name))].sort();

    c.innerHTML = `
      ${state.msg ? `<p class="ok">${esc(state.msg)}</p>` : ""}
      <div class="toolbar">
        <button class="btn" id="btn-new" type="button">+ Tambah Produk</button>
        <label class="toggle">
          <input type="checkbox" id="show-arch" ${state.showArchived ? "checked" : ""} />
          Tampilkan yang diarsipkan
        </label>
      </div>
      ${state.formOpen ? formHtml(names) : ""}
      ${apps.length === 0
        ? `<div class="card note"><div>✿ ❀ ✿</div><p class="muted">Belum ada produk. Tambahkan aplikasi pertama Anda.</p></div>`
        : apps.map((a) => appCard(a, groups[a])).join("")}`;
    state.msg = "";
  }

  async function loadRender() {
    try {
      await load();
      render();
    } catch (err) {
      if (state.container) {
        state.container.innerHTML = `<div class="card note"><p>Produk belum bisa dimuat.</p>
          <p class="muted">${esc(err.message || err)}</p></div>`;
      }
    }
  }

  // ---------- Aksi ----------
  async function onSubmit(e) {
    if (e.target.id !== "prod-form") return;
    e.preventDefault();
    const f = e.target;
    const err = f.querySelector("#form-error");
    err.textContent = "";

    const appName = f.app_name.value.trim();
    const variant = f.variant.value.trim();
    const pick = f.duration_pick.value;
    const duration = pick === "__custom" ? f.duration_custom.value.trim() : pick;
    const priceRaw = f.sell_price.value;

    if (!appName) { err.textContent = "Nama aplikasi wajib diisi."; return; }
    if (!duration) { err.textContent = "Durasi wajib diisi."; return; }
    if (priceRaw === "" || Number(priceRaw) < 0) { err.textContent = "Harga jual harus berupa angka, minimal 0."; return; }

    const payload = { app_name: appName, variant, duration, sell_price: Number(priceRaw) };
    const btn = f.querySelector("button[type=submit]");
    btn.disabled = true;

    const req = state.editingId
      ? sb().from("products").update(payload).eq("id", state.editingId)
      : sb().from("products").insert(payload);
    const { error } = await req;
    btn.disabled = false;

    if (error) { err.textContent = "Gagal menyimpan: " + error.message; return; }

    state.msg = state.editingId ? "Perubahan produk tersimpan ✿" : "Produk baru tersimpan ✿";
    state.formOpen = false;
    state.editingId = null;
    await loadRender();
  }

  async function toggleArchive(id) {
    const p = state.products.find((x) => x.id === id);
    if (!p) return;
    const { error } = await sb().from("products").update({ is_archived: !p.is_archived }).eq("id", id);
    if (error) { alert("Gagal: " + error.message); return; }
    state.msg = p.is_archived ? "Produk diaktifkan kembali." : "Produk diarsipkan.";
    await loadRender();
  }

  async function removeProduct(id) {
    const p = state.products.find((x) => x.id === id);
    if (!p) return;
    const ok = confirm(`Hapus produk "${p.app_name} - ${p.variant || "Standar"} - ${p.duration}"?\nRiwayat transaksi lama tetap tersimpan.`);
    if (!ok) return;
    const { error } = await sb().from("products").delete().eq("id", id);
    if (error) { alert("Gagal menghapus: " + error.message); return; }
    state.msg = "Produk dihapus.";
    await loadRender();
  }

  function onClick(e) {
    const t = e.target;
    if (t.closest("#btn-new")) {
      state.editingId = null; state.formOpen = true; render(); return;
    }
    if (t.closest("#btn-cancel")) {
      state.editingId = null; state.formOpen = false; render(); return;
    }
    const ed = t.closest("[data-edit]");
    if (ed) {
      state.editingId = ed.dataset.edit; state.formOpen = true; render();
      state.container.querySelector("#prod-form")?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    const ar = t.closest("[data-archive]");
    if (ar) { toggleArchive(ar.dataset.archive); return; }
    const dl = t.closest("[data-del]");
    if (dl) { removeProduct(dl.dataset.del); return; }
  }

  function onChange(e) {
    if (e.target.id === "show-arch") {
      state.showArchived = e.target.checked; render(); return;
    }
    if (e.target.name === "duration_pick") {
      const w = state.container.querySelector("#custom-wrap");
      if (w) w.hidden = e.target.value !== "__custom";
    }
  }

  // ---------- Entry point ----------
  function injectStyle() {
    if (document.getElementById("prod-style")) return;
    const s = document.createElement("style");
    s.id = "prod-style";
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  window.renderProducts = function (container) {
    injectStyle();
    state.container = container;
    state.formOpen = false;
    state.editingId = null;
    if (!container.dataset.prodBound) {
      container.addEventListener("click", onClick);
      container.addEventListener("change", onChange);
      container.addEventListener("submit", onSubmit);
      container.dataset.prodBound = "1";
    }
    container.innerHTML = `<p class="muted note">Memuat produk...</p>`;
    loadRender();
  };
})();
