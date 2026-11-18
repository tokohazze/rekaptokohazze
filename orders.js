// Toko Hazze — Tahap 4: Input Order (formulir pesanan dengan perhitungan otomatis).
(function () {
  const CSS = `
  .order-card h3{margin-bottom:10px}
  .order-card h4{font-family:var(--font-body);color:var(--pink-deep);margin:18px 0 8px;font-size:17px}
  .order-card section{border-top:2px dashed #d3cbf3;padding-top:4px}
  .grid2{display:grid;grid-template-columns:1fr;gap:0 14px}
  @media (min-width:700px){.grid2{grid-template-columns:1fr 1fr}}
  .f{display:block;margin-bottom:12px}
  .f span{display:block;font-size:14px;font-weight:700;margin-bottom:6px}
  .f input,.f select{width:100%;padding:10px 12px;border:2px solid var(--blue);border-radius:12px;font:inherit;background:#fff;color:var(--text)}
  .f input[readonly]{background:var(--cream)}
  .f input:disabled{background:var(--cream);color:var(--text-soft)}
  .f input:focus,.f select:focus{outline:none;border-color:var(--pink-deep)}
  .hint{font-size:12px;color:var(--text-soft);margin:-6px 0 12px}
  .totals-box{background:var(--cream);border-radius:16px;padding:14px;margin:16px 0;display:grid;gap:8px;grid-template-columns:repeat(auto-fit,minmax(150px,1fr))}
  .totals-box div{font-size:13px}
  .totals-box b{display:block;font-family:var(--font-body);font-size:18px;color:var(--pink-deep)}
  .totals-box .profit b{color:var(--green-deep)}
  .garansi-tag{font-size:14px;font-weight:700;border-radius:14px;padding:10px 12px;margin:8px 0 0}
  .garansi-tag.on{background:var(--green);color:#2f6f5e}
  .garansi-tag.off{background:var(--cream);color:var(--text-soft);border:2px dashed #d3cbf3}
  .form-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}
  .btn{font:inherit;font-weight:700;border:none;border-radius:999px;padding:10px 18px;cursor:pointer;background:var(--pink);color:var(--text);box-shadow:var(--shadow)}
  .btn:disabled{opacity:.6;cursor:wait}
  .btn-ghost{background:var(--white)}
  .err{color:#c0546f;font-size:14px;min-height:18px;margin:6px 0 0}
  .ok{color:var(--green-deep);font-weight:700;margin:0 0 12px}
  .muted{color:var(--text-soft);font-size:14px}
  `;

  const DURASI = ["7 hari", "15 hari", "30 hari", "1 bulan", "3 bulan", "6 bulan", "1 tahun"];
  const PAYMENT = ["Belum Lunas", "Lunas", "DP / Dibayar Sebagian"];
  const WORK = ["Menunggu", "Diproses", "Selesai", "Pending", "Dibatalkan"];

  const state = { container: null, products: [], customers: [], supplierNames: [], msg: "", busy: false };

  const sb = () => window.hazzeSb;
  const pad = (n) => String(n).padStart(2, "0");
  const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parseISO = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
  const fmtRp = (n) => "Rp " + Math.round(Number(n) || 0).toLocaleString("id-ID");
  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const varLabel = (v) => v || "Standar";

  // Expired = tanggal aktivasi + durasi. Bulan dihitung dengan batas akhir bulan (31 Jan + 1 bulan = 28/29 Feb).
  function addDuration(dateStr, dur) {
    const m = /^(\d+)\s*(hari|minggu|bulan|tahun)$/i.exec((dur || "").trim());
    if (!m || !dateStr) return null;
    const n = Number(m[1]);
    const unit = m[2].toLowerCase();
    const d = parseISO(dateStr);
    if (unit === "hari") d.setDate(d.getDate() + n);
    else if (unit === "minggu") d.setDate(d.getDate() + 7 * n);
    else {
      const day = d.getDate();
      d.setDate(1);
      d.setMonth(d.getMonth() + (unit === "bulan" ? n : 12 * n));
      const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      d.setDate(Math.min(day, last));
    }
    return toISO(d);
  }

  function genTrxId() {
    const d = new Date();
    const ymd = `${String(d.getFullYear()).slice(2)}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
    const rnd = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `HZ-${ymd}-${rnd}`;
  }

  // ---------- Data ----------
  async function loadAll() {
    const [p, c, o, s] = await Promise.all([
      sb().from("products").select("*").eq("is_archived", false),
      sb().from("customers").select("*").order("name"),
      sb().from("orders").select("supplier_name"),
      sb().from("suppliers").select("name")
    ]);
    for (const r of [p, c, o, s]) if (r.error) throw r.error;
    state.products = p.data || [];
    state.customers = c.data || [];
    state.supplierNames = [
      ...new Set([...(s.data || []).map((x) => x.name), ...(o.data || []).map((x) => x.supplier_name)].filter(Boolean))
    ].sort((a, b) => a.localeCompare(b, "id"));
  }

  // ---------- Pilihan produk berantai: aplikasi -> varian -> durasi ----------
  const appsList = () => [...new Set(state.products.map((p) => p.app_name))].sort((a, b) => a.localeCompare(b, "id"));
  const variantsOf = (app) => [...new Set(state.products.filter((p) => p.app_name === app).map((p) => p.variant || ""))];
  const durationsOf = (app, v) =>
    [...new Set(state.products.filter((p) => p.app_name === app && (p.variant || "") === v).map((p) => p.duration))];
  const findProduct = (app, v, d) =>
    state.products.find((p) => p.app_name === app && (p.variant || "") === v && p.duration === d);

  // ---------- Tampilan ----------
  function formHtml() {
    const today = toISO(new Date());
    return `
    <form id="order-form" class="card order-card">
      <h3>Input Order Baru</h3>

      <section>
        <h4>A. Data Customer</h4>
        <label class="f">
          <span>Customer lama (opsional)</span>
          <select name="customer_pick">
            <option value="">— Customer baru —</option>
            ${state.customers.map((c) => `<option value="${c.id}">${esc(c.name)} · ${esc(c.phone || "")}</option>`).join("")}
          </select>
        </label>
        <div class="grid2">
          <label class="f"><span>Tanggal order</span><input type="date" name="order_date" value="${today}" required /></label>
          <label class="f"><span>ID transaksi</span><input value="Dibuat otomatis saat disimpan" disabled /></label>
          <label class="f"><span>Nama customer</span><input name="cust_name" required /></label>
          <label class="f"><span>Nomor HP / WhatsApp</span><input name="cust_phone" inputmode="tel" required /></label>
          <label class="f"><span>Email (opsional)</span><input name="cust_email" type="email" /></label>
          <label class="f"><span>Username (opsional)</span><input name="cust_username" /></label>
        </div>
        <label class="f"><span>Catatan customer (opsional)</span><input name="cust_note" /></label>
      </section>

      <section>
        <h4>B. Data Produk</h4>
        <div class="grid2">
          <label class="f">
            <span>Nama aplikasi</span>
            <select name="app" required>
              <option value="">Pilih aplikasi</option>
              ${appsList().map((a) => `<option value="${esc(a)}">${esc(a)}</option>`).join("")}
            </select>
          </label>
          <label class="f">
            <span>Varian</span>
            <select name="variant"><option value="">Pilih aplikasi dulu</option></select>
          </label>
          <label class="f">
            <span>Durasi</span>
            <select name="duration" required><option value="">Pilih varian dulu</option></select>
          </label>
          <label class="f" id="dur-custom-wrap" hidden>
            <span>Tulis durasi</span>
            <input name="dur_custom" placeholder="contoh: 2 minggu" />
          </label>
          <label class="f"><span>Jumlah</span><input name="qty" type="number" min="1" step="1" value="1" required /></label>
          <label class="f">
            <span>Harga jual per unit (Rp)</span>
            <input name="sell" type="number" min="0" step="500" required />
          </label>
        </div>
        <p class="hint">Harga terisi otomatis dari daftar produk, tetapi tetap bisa diubah untuk transaksi ini.</p>
      </section>

      <section>
        <h4>C. Modal & Supplier</h4>
        <div class="grid2">
          <label class="f">
            <span>Supplier / admin tempat beli</span>
            <input name="supplier" list="supplier-list" placeholder="ketik nama baru atau pilih" />
            <datalist id="supplier-list">
              ${state.supplierNames.map((s) => `<option value="${esc(s)}">`).join("")}
            </datalist>
          </label>
          <label class="f">
            <span>Harga modal per unit (Rp)</span>
            <input name="cost" type="number" min="0" step="500" required />
          </label>
        </div>
        <p class="hint">Harga modal diisi manual karena harga supplier bisa berubah.</p>
      </section>

      <section>
        <h4>D. Tanggal & Masa Aktif</h4>
        <div class="grid2">
          <label class="f"><span>Tanggal aktivasi</span><input type="date" name="act" value="${today}" required /></label>
          <label class="f"><span>Tanggal expired</span><input type="date" name="exp" required /></label>
        </div>
        <p class="hint">Expired dihitung otomatis dari tanggal aktivasi + durasi. Bisa diubah manual jika perlu.</p>
      </section>

      <section>
        <h4>E. Status</h4>
        <div class="grid2">
          <label class="f">
            <span>Status pembayaran</span>
            <select name="payment">${PAYMENT.map((s) => `<option>${s}</option>`).join("")}</select>
          </label>
          <label class="f">
            <span>Status pengerjaan</span>
            <select name="work">${WORK.map((s) => `<option ${s === "Menunggu" ? "selected" : ""}>${s}</option>`).join("")}</select>
          </label>
        </div>
        <label class="f"><span>Catatan transaksi (opsional)</span><input name="note" /></label>
      </section>

      <section>
        <h4>G. Bukti Login &amp; Garansi</h4>
        <label class="f"><span>Upload bukti login (opsional)</span>
          <input type="file" name="bukti" accept="image/*" /></label>
        <p id="garansi-status" class="garansi-tag off">Garansi: tidak aktif (belum ada bukti login)</p>
        <p class="muted" style="font-size:13px;margin:4px 0 0">Kalau ada bukti login, garansi ditandai aktif. Tanpa bukti, garansi tidak aktif.</p>
      </section>

      <section>
        <h4>F. Ringkasan Otomatis</h4>
        <div class="totals-box">
          <div>Total penjualan<b id="t-sell">Rp 0</b></div>
          <div>Total modal<b id="t-cost">Rp 0</b></div>
          <div class="profit">Keuntungan<b id="t-profit">Rp 0</b></div>
        </div>
      </section>

      <div class="form-actions">
        <button class="btn" type="submit">Simpan Order</button>
        <button class="btn btn-ghost" type="button" id="btn-reset">Reset Form</button>
        <button class="btn btn-ghost" type="button" id="btn-cancel">Batalkan</button>
      </div>
      <p id="form-error" class="err"></p>
    </form>`;
  }

  function render() {
    const c = state.container;
    if (!c) return;
    c.innerHTML = (state.msg ? `<p class="ok">${esc(state.msg)}</p>` : "") + formHtml();
    state.msg = "";
    const f = c.querySelector("#order-form");
    restoreDraft(f);
    updateGaransiTag(f);
    updateCalc(f);
    updateExpiry(f);
  }

  // ---------- Perhitungan & pengisian otomatis ----------
  function currentDuration(f) {
    return f.elements.duration.value === "__custom" ? f.elements.dur_custom.value.trim() : f.elements.duration.value;
  }

  function updateCalc(f) {
    const q = Number(f.elements.qty.value) || 0;
    const s = Number(f.elements.sell.value) || 0;
    const m = Number(f.elements.cost.value) || 0;
    f.querySelector("#t-sell").textContent = fmtRp(q * s);
    f.querySelector("#t-cost").textContent = fmtRp(q * m);
    f.querySelector("#t-profit").textContent = fmtRp(q * (s - m));
  }

  function updateExpiry(f) {
    const exp = addDuration(f.elements.act.value, currentDuration(f));
    if (exp) f.elements.exp.value = exp;
  }

  function onChange(e) {
    const f = e.target.form;
    if (!f || f.id !== "order-form") return;
    const name = e.target.name;
    if (!restoring) saveDraftSoon(f);
    if (name === "bukti") { updateGaransiTag(f); return; }

    if (name === "customer_pick") {
      const id = e.target.value;
      const cust = state.customers.find((x) => x.id === id);
      const locked = !!cust;
      ["cust_name", "cust_phone", "cust_email", "cust_username", "cust_note"].forEach((n) => {
        f.elements[n].readOnly = locked;
      });
      f.elements.cust_name.value = cust?.name || "";
      f.elements.cust_phone.value = cust?.phone || "";
      f.elements.cust_email.value = cust?.email || "";
      f.elements.cust_username.value = cust?.username || "";
      f.elements.cust_note.value = cust?.note || "";
      return;
    }

    if (name === "app") {
      const app = e.target.value;
      const variants = app ? variantsOf(app) : [];
      f.elements.variant.innerHTML = app
        ? variants.map((v) => `<option value="${esc(v)}">${esc(varLabel(v))}</option>`).join("")
        : `<option value="">Pilih aplikasi dulu</option>`;
      if (app) fillDurations(f, app, f.elements.variant.value);
      else f.elements.duration.innerHTML = `<option value="">Pilih varian dulu</option>`;
      updatePriceFromProduct(f);
      updateExpiry(f);
      return;
    }

    if (name === "variant") {
      fillDurations(f, f.elements.app.value, e.target.value);
      updatePriceFromProduct(f);
      updateExpiry(f);
      return;
    }

    if (name === "duration") {
      f.querySelector("#dur-custom-wrap").hidden = e.target.value !== "__custom";
      updatePriceFromProduct(f);
      updateExpiry(f);
      return;
    }

    if (name === "act") { updateExpiry(f); return; }
    if (name === "dur_custom") { updateExpiry(f); return; }
  }

  function fillDurations(f, app, variant) {
    const list = durationsOf(app, variant);
    f.elements.duration.innerHTML =
      `<option value="">Pilih durasi</option>` +
      list.map((d) => `<option value="${esc(d)}">${esc(d)}</option>`).join("") +
      `<option value="__custom">Durasi khusus</option>`;
  }

  function updatePriceFromProduct(f) {
    const p = findProduct(f.elements.app.value, f.elements.variant.value, f.elements.duration.value);
    if (p) f.elements.sell.value = p.sell_price;
  }

  // Status garansi mengikuti ada tidaknya file bukti login
  function updateGaransiTag(f) {
    const tag = f && f.querySelector("#garansi-status");
    if (!tag) return;
    const ada = !!(f.elements.bukti && f.elements.bukti.files && f.elements.bukti.files.length);
    tag.textContent = ada
      ? "Garansi: AKTIF (ada bukti login)"
      : "Garansi: tidak aktif (belum ada bukti login)";
    tag.className = "garansi-tag " + (ada ? "on" : "off");
  }

  // ---------- Draf (isian yang belum disimpan, lihat draft.js) ----------
  let restoring = false;

  function saveDraftSoon(f) {
    // Ditunda sedikit supaya perubahan dari handler ikut tersimpan
    setTimeout(() => {
      if (restoring || !f || !f.isConnected) return;
      window.hazzeDraft.save("order", window.hazzeDraft.collect(f));
    }, 0);
  }

  function restoreDraft(f) {
    const d = window.hazzeDraft.load("order");
    if (!f || !d) return;
    restoring = true;
    const fire = (el) => el.dispatchEvent(new Event("change", { bubbles: true }));
    try {
      // Urutan penting: pelanggan, lalu aplikasi, varian, durasi, baru sisanya
      if (d.customer_pick) { f.elements.customer_pick.value = d.customer_pick; fire(f.elements.customer_pick); }
      if (d.app) { f.elements.app.value = d.app; fire(f.elements.app); }
      if (d.variant) { f.elements.variant.value = d.variant; fire(f.elements.variant); }
      if (d.duration) { f.elements.duration.value = d.duration; fire(f.elements.duration); }
      window.hazzeDraft.apply(f, d);
    } finally {
      restoring = false;
    }
  }

  function onInput(e) {
    const f = e.target.form;
    if (!f || f.id !== "order-form") return;
    if (e.target.name === "dur_custom") updateExpiry(f);
    updateCalc(f);
    saveDraftSoon(f);
  }

  // ---------- Simpan ----------
  async function onSubmit(e) {
    if (e.target.id !== "order-form") return;
    e.preventDefault();
    if (state.busy) return;
    const f = e.target;
    const err = f.querySelector("#form-error");
    err.textContent = "";

    const el = f.elements;
    const customerPick = el.customer_pick.value;
    const cust = {
      name: el.cust_name.value.trim(),
      phone: el.cust_phone.value.trim(),
      email: el.cust_email.value.trim() || null,
      username: el.cust_username.value.trim() || null,
      note: el.cust_note.value.trim() || null
    };
    const orderDate = el.order_date.value;
    const appName = el.app.value;
    const variant = el.variant.value || "";
    const duration = currentDuration(f);
    const qty = Math.floor(Number(el.qty.value));
    const sell = Number(el.sell.value);
    const cost = Number(el.cost.value);
    const supplier = el.supplier.value.trim() || null;
    const act = el.act.value;
    const exp = el.exp.value;
    const payment = el.payment.value;
    const work = el.work.value;
    const note = el.note.value.trim() || null;

    if (!customerPick && (!cust.name || !cust.phone)) { err.textContent = "Nama dan nomor HP customer wajib diisi."; return; }
    if (!orderDate) { err.textContent = "Tanggal order wajib diisi."; return; }
    if (!appName) { err.textContent = "Pilih nama aplikasi."; return; }
    if (!duration) { err.textContent = "Durasi wajib diisi."; return; }
    if (!(qty >= 1)) { err.textContent = "Jumlah minimal 1."; return; }
    if (!(sell >= 0) || el.sell.value === "") { err.textContent = "Harga jual harus berupa angka."; return; }
    if (!(cost >= 0) || el.cost.value === "") { err.textContent = "Harga modal harus berupa angka."; return; }
    if (!act || !exp) { err.textContent = "Tanggal aktivasi dan expired wajib diisi."; return; }
    if (exp < act) { err.textContent = "Tanggal expired tidak boleh sebelum tanggal aktivasi."; return; }

    const product = findProduct(appName, variant, duration);
    const today = toISO(new Date());
    const serviceStatus = exp < today ? "Expired" : "Aktif";

    const btn = f.querySelector("button[type=submit]");
    state.busy = true;
    btn.disabled = true;
    try {
      let customerId = customerPick || null;
      if (!customerId) {
        const { data, error } = await sb().from("customers").insert(cust).select("id").single();
        if (error) throw error;
        customerId = data.id;
      }

      // Bukti login (opsional): kalau ada, garansi ditandai aktif
      const buktiFile = el.bukti && el.bukti.files ? el.bukti.files[0] : null;
      let buktiPath = null;
      if (buktiFile) {
        const ext = ((buktiFile.name.split(".").pop() || "").toLowerCase().replace(/[^a-z0-9]/g, "")) || "jpg";
        buktiPath = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: upErr } = await sb().storage.from("bukti-login")
          .upload(buktiPath, buktiFile, { contentType: buktiFile.type || "image/jpeg" });
        if (upErr) throw upErr;
      }

      // ID transaksi dibuat otomatis; coba ulang jika kebetulan bentrok.
      let saved = false;
      let lastError = null;
      for (let i = 0; i < 3 && !saved; i++) {
        const row = {
          transaction_id: genTrxId(),
          order_date: orderDate,
          customer_id: customerId,
          product_id: product ? product.id : null,
          app_name: appName,
          variant,
          duration,
          quantity: qty,
          sell_price: sell,
          cost_price: cost,
          supplier_name: supplier,
          activation_date: act,
          expired_date: exp,
          payment_status: payment,
          work_status: work,
          service_status: serviceStatus,
          note,
          garansi_aktif: !!buktiPath,
          bukti_login_path: buktiPath
        };
        const { error } = await sb().from("orders").insert(row);
        if (!error) saved = true;
        else if (error.code === "23505") lastError = error;
        else throw error;
      }
      if (!saved) {
        // Order gagal disimpan: file bukti yang sudah terunggah dibersihkan
        if (buktiPath) await sb().storage.from("bukti-login").remove([buktiPath]);
        throw lastError || new Error("Gagal membuat ID transaksi.");
      }

      state.msg = "Order berhasil disimpan ✿";
      window.hazzeDraft.clear("order");
      await loadAll();
      render();
    } catch (ex) {
      err.textContent = "Gagal menyimpan: " + (ex.message || ex);
    } finally {
      state.busy = false;
      btn.disabled = false;
    }
  }

  function onClick(e) {
    if (e.target.closest("#btn-reset")) {
      if (confirm("Kosongkan formulir? Data yang belum disimpan akan hilang.")) {
        window.hazzeDraft.clear("order");
        render();
      }
      return;
    }
    if (e.target.closest("#btn-cancel")) {
      if (confirm("Batalkan input order ini?")) {
        state.msg = "";
        window.hazzeDraft.clear("order");
        render();
      }
    }
  }

  // ---------- Entry point ----------
  function injectStyle() {
    if (document.getElementById("order-style")) return;
    const s = document.createElement("style");
    s.id = "order-style";
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  window.renderInputOrder = function (container) {
    injectStyle();
    state.container = container;
    if (!container.dataset.orderBound) {
      container.addEventListener("change", onChange);
      container.addEventListener("input", onInput);
      container.addEventListener("submit", onSubmit);
      container.addEventListener("click", onClick);
      container.dataset.orderBound = "1";
    }
    container.innerHTML = `<p class="muted">Memuat data...</p>`;
    loadAll()
      .then(render)
      .catch((err) => {
        container.innerHTML = `<div class="card"><p>Form order belum bisa dimuat.</p>
          <p class="muted">${esc(err.message || err)}</p></div>`;
      });
  };
})();
