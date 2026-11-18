// Toko Hazze — Tahap 5: Rekap Order (daftar, cari, filter, detail, edit, perpanjang, hapus, export Excel).
(function () {
  const CSS = `
  .filters{margin-bottom:14px}
  .filters input[type=search]{width:100%;padding:11px 14px;border:2px solid var(--blue);border-radius:14px;font:inherit;background:#fff;margin-bottom:12px}
  .filters input[type=search]:focus,.filters select,.filters input[type=date]{outline:none}
  .filter-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}
  @media (min-width:900px){.filter-grid{grid-template-columns:repeat(3,1fr)}}
  .f{display:block}
  .f span{display:block;font-size:12px;font-weight:700;margin-bottom:4px}
  .f select,.f input{width:100%;padding:8px 10px;border:2px solid var(--blue);border-radius:12px;font:inherit;background:#fff;color:var(--text)}
  .bar{display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between;margin-top:12px}
  .order-list{display:grid;gap:12px;grid-template-columns:1fr}
  @media (min-width:900px){.order-list{grid-template-columns:1fr 1fr}}
  .order{padding:16px}
  .o-head{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:6px}
  .trx{font-size:12px;font-weight:700;color:var(--text-soft);letter-spacing:.5px}
  .svc{font-size:11px;font-weight:700;border-radius:999px;padding:3px 10px;background:var(--green)}
  .svc.Akan-expired{background:var(--butter)}
  .svc.Expired{background:#ece6e2;color:#68503f}
  .o-name{font-family:var(--font-body);font-size:17px}
  .o-app{font-size:14px;margin:2px 0 10px;color:var(--pink-deep);font-weight:700}
  .o-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px 12px;font-size:12px;color:var(--text-soft)}
  .o-grid b{display:block;font-size:14px;color:var(--text);font-weight:700}
  .profit b{color:var(--green-deep)!important}
  .o-actions{display:flex;flex-wrap:wrap;gap:6px;margin-top:12px}
  .btn{font:inherit;font-weight:700;border:none;border-radius:999px;padding:9px 16px;cursor:pointer;background:var(--pink);color:var(--text);box-shadow:var(--shadow);font-size:14px}
  .btn-ghost{background:var(--white)}
  .btn-blue{background:var(--blue)}
  .btn-danger{background:#f7d1e8;color:#a0384f}
  .btn:disabled{opacity:.6;cursor:wait}
  .chip{font:inherit;font-size:13px;font-weight:700;border:2px solid var(--blue);background:#fff;color:var(--text);border-radius:999px;padding:6px 12px;cursor:pointer}
  .muted{color:var(--text-soft);font-size:14px}
  .ok{color:var(--green-deep);font-weight:700;margin:0 0 12px}
  .note{text-align:center;padding:24px;margin-top:10px}
  .overlay{position:fixed;inset:0;background:rgba(114,36,110,.35);display:grid;place-items:center;padding:16px;z-index:50}
  .modal{background:var(--white);border-radius:24px;padding:20px;max-width:520px;width:100%;max-height:90vh;overflow:auto;box-shadow:var(--shadow);border:2px dashed var(--pink)}
  .modal h3{margin-bottom:12px}
  .modal .f{margin-bottom:10px}
  .modal .f input,.modal .f select{background:#fff}
  .dl{display:grid;grid-template-columns:1fr 1fr;gap:10px 14px;font-size:14px}
  .dl span{display:block;font-size:12px;color:var(--text-soft)}
  .dl b{font-weight:700}
  .err{color:#c0546f;font-size:14px;min-height:18px;margin:6px 0 0}
  .form-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
  `;

  const DURASI = ["7 hari", "15 hari", "30 hari", "1 bulan", "3 bulan", "6 bulan", "1 tahun"];
  const PAYMENT = ["Belum Lunas", "Lunas", "DP / Dibayar Sebagian"];
  const WORK = ["Menunggu", "Diproses", "Selesai", "Pending", "Dibatalkan"];
  const SVC = ["Aktif", "Akan expired", "Expired"];

  const state = {
    container: null,
    rows: [],
    products: [],
    search: "",
    period: "all",
    from: "",
    to: "",
    fApp: "",
    fSupp: "",
    fPay: "",
    fWork: "",
    fSvc: "",
    msg: "",
    modal: null,
    busy: false
  };

  const sb = () => window.hazzeSb;
  const pad = (n) => String(n).padStart(2, "0");
  const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parseISO = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
  const fmtRp = (n) => "Rp " + Math.round(Number(n) || 0).toLocaleString("id-ID");
  const fmtDate = (s) => (s ? parseISO(s).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "-");
  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const varLabel = (v) => v || "Standar";
  const uniq = (arr) => [...new Set(arr.filter(Boolean))].sort((a, b) => a.localeCompare(b, "id"));

  // Expired = tanggal aktivasi + durasi (bulan dihitung dengan batas akhir bulan).
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
    return `HZ-${ymd}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  }

  // Status layanan dihitung dari tanggal expired: Aktif, Akan expired (3 hari atau kurang), Expired.
  function svcStatus(exp) {
    if (!exp) return "Aktif";
    const diff = Math.round((parseISO(exp) - today()) / 86400000);
    if (diff < 0) return "Expired";
    if (diff <= 3) return "Akan expired";
    return "Aktif";
  }

  const profitOf = (x) => Number(x.total_sell) - Number(x.total_cost);

  // ---------- Data ----------
  async function loadAll() {
    const [o, p] = await Promise.all([
      sb().from("orders")
        .select("*, customers(name, phone, username, email)")
        .order("order_date", { ascending: false })
        .order("created_at", { ascending: false }),
      sb().from("products").select("*")
    ]);
    if (o.error) throw o.error;
    if (p.error) throw p.error;
    state.rows = o.data || [];
    state.products = p.data || [];
    if (window.hazzeGaransi) await window.hazzeGaransi.load();
  }

  function periodRange() {
    const t = today();
    if (state.period === "week") return { from: toISO(addDays(t, -6)), to: toISO(t) };
    if (state.period === "month") return { from: toISO(addDays(t, -29)), to: toISO(t) };
    if (state.period === "custom" && state.from && state.to) return { from: state.from, to: state.to };
    return { from: "", to: "" };
  }

  function filtered() {
    const r = periodRange();
    const q = state.search.trim().toLowerCase();
    return state.rows.filter((x) => {
      if (r.from && (x.order_date < r.from || x.order_date > r.to)) return false;
      if (state.fApp && x.app_name !== state.fApp) return false;
      if (state.fSupp && (x.supplier_name || "") !== state.fSupp) return false;
      if (state.fPay && x.payment_status !== state.fPay) return false;
      if (state.fWork && x.work_status !== state.fWork) return false;
      if (state.fSvc && svcStatus(x.expired_date) !== state.fSvc) return false;
      if (q) {
        const hay = [
          x.transaction_id, x.customers?.name, x.customers?.phone,
          x.customers?.username, x.app_name, x.supplier_name
        ].join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }

  // ---------- Tampilan ----------
  // allLabel = null berarti tanpa pilihan kosong (untuk dropdown di dalam modal).
  function selectOpts(list, current, allLabel) {
    const blank = allLabel === null ? "" : `<option value="">${allLabel}</option>`;
    return blank +
      list.map((v) => `<option value="${esc(v)}" ${v === current ? "selected" : ""}>${esc(v)}</option>`).join("");
  }

  function filtersHtml() {
    const apps = uniq(state.rows.map((x) => x.app_name));
    const supps = uniq(state.rows.map((x) => x.supplier_name));
    const periods = [
      ["all", "Semua"], ["week", "7 hari terakhir"], ["month", "30 hari terakhir"], ["custom", "Rentang khusus"]
    ];
    return `
      <div class="card filters">
        <input type="search" id="f-search" placeholder="Cari nama, HP, username, aplikasi, supplier, atau ID" value="${esc(state.search)}" />
        <div class="filter-grid">
          <label class="f"><span>Periode</span>
            <select name="period">${periods.map(([v, l]) => `<option value="${v}" ${v === state.period ? "selected" : ""}>${l}</option>`).join("")}</select>
          </label>
          ${state.period === "custom" ? `
          <label class="f"><span>Dari</span><input type="date" name="from" value="${state.from}" /></label>
          <label class="f"><span>Sampai</span><input type="date" name="to" value="${state.to}" /></label>` : ""}
          <label class="f"><span>Aplikasi</span>
            <select name="fApp">${selectOpts(apps, state.fApp, "Semua aplikasi")}</select></label>
          <label class="f"><span>Supplier</span>
            <select name="fSupp">${selectOpts(supps, state.fSupp, "Semua supplier")}</select></label>
          <label class="f"><span>Status pembayaran</span>
            <select name="fPay">${selectOpts(PAYMENT, state.fPay, "Semua")}</select></label>
          <label class="f"><span>Status pengerjaan</span>
            <select name="fWork">${selectOpts(WORK, state.fWork, "Semua")}</select></label>
          <label class="f"><span>Status layanan</span>
            <select name="fSvc">${selectOpts(SVC, state.fSvc, "Semua")}</select></label>
        </div>
        <div class="bar">
          <span class="muted" id="count"></span>
          <button class="btn" id="btn-export" type="button">Export Excel</button>
        </div>
      </div>`;
  }

  function card(x) {
    const st = svcStatus(x.expired_date);
    return `
      <div class="card order">
        <div class="o-head">
          <span class="trx">${esc(x.transaction_id)}</span>
          <span class="svc ${st.replace(" ", "-")}">${st}</span>
        </div>
        <div class="o-name">${esc(x.customers?.name || "-")} <span class="muted">· ${esc(x.customers?.phone || "-")}</span></div>
        <div class="o-app">${esc(x.app_name)} · ${esc(varLabel(x.variant))} · ${esc(x.duration)} × ${x.quantity}</div>
        <div class="o-grid">
          <div>Tanggal order<b>${fmtDate(x.order_date)}</b></div>
          <div>Aktivasi<b>${fmtDate(x.activation_date)}</b></div>
          <div>Expired<b>${fmtDate(x.expired_date)}</b></div>
          <div>Supplier<b>${esc(x.supplier_name || "-")}</b></div>
          <div>Harga jual<b>${fmtRp(x.total_sell)}</b></div>
          <div>Modal<b>${fmtRp(x.total_cost)}</b></div>
          <div class="profit">Keuntungan<b>${fmtRp(profitOf(x))}</b></div>
          <div>Pembayaran<b>${esc(x.payment_status)}</b></div>
          <div>Pengerjaan<b>${esc(x.work_status)}</b></div>
        </div>
        <div class="o-actions">
          <button class="chip" data-act="detail" data-id="${x.id}">Detail</button>
          <button class="chip" data-act="edit" data-id="${x.id}">Edit</button>
          <button class="chip" data-act="renew" data-id="${x.id}">Perpanjang</button>
          <button class="chip" data-act="delete" data-id="${x.id}" style="border-color:#f7d1e8;color:#b4465f">Hapus</button>
        </div>
      </div>`;
  }

  function renderList() {
    const list = filtered();
    const el = state.container.querySelector("#rekap-list");
    const count = state.container.querySelector("#count");
    if (count) count.textContent = `${list.length} transaksi`;
    if (!el) return;
    el.innerHTML = list.length === 0
      ? `<div class="card note"><div>✿ ❀ ✿</div><p class="muted">Belum ada transaksi yang cocok. ${state.rows.length === 0 ? "Buat order baru di menu Input Order." : ""}</p></div>`
      : `<div class="order-list">${list.map(card).join("")}</div>`;
  }

  function render() {
    const c = state.container;
    if (!c) return;
    c.innerHTML = `
      ${state.msg ? `<p class="ok">${esc(state.msg)}</p>` : ""}
      ${filtersHtml()}
      <div id="rekap-list"></div>
      <div id="modal-root"></div>`;
    state.msg = "";
    renderList();
    renderModal();
  }

  // ---------- Modal ----------
  function findRow(id) { return state.rows.find((x) => x.id === id); }

  function renderModal() {
    const root = state.container?.querySelector("#modal-root");
    if (!root) return;
    const m = state.modal;
    if (!m) { root.innerHTML = ""; return; }
    const x = findRow(m.id);
    if (!x) { state.modal = null; root.innerHTML = ""; return; }

    if (m.type === "detail") {
      root.innerHTML = `<div class="overlay" data-close>
        <div class="modal" role="dialog">
          <h3>Detail Transaksi</h3>
          <div class="dl">
            <div><span>ID transaksi</span><b>${esc(x.transaction_id)}</b></div>
            <div><span>Tanggal order</span><b>${fmtDate(x.order_date)}</b></div>
            <div><span>Nama customer</span><b>${esc(x.customers?.name || "-")}</b></div>
            <div><span>Nomor HP</span><b>${esc(x.customers?.phone || "-")}</b></div>
            <div><span>Username</span><b>${esc(x.customers?.username || "-")}</b></div>
            <div><span>Email</span><b>${esc(x.customers?.email || "-")}</b></div>
            <div><span>Aplikasi</span><b>${esc(x.app_name)}</b></div>
            <div><span>Varian</span><b>${esc(varLabel(x.variant))}</b></div>
            <div><span>Durasi</span><b>${esc(x.duration)}</b></div>
            <div><span>Jumlah</span><b>${x.quantity}</b></div>
            <div><span>Harga jual per unit</span><b>${fmtRp(x.sell_price)}</b></div>
            <div><span>Modal per unit</span><b>${fmtRp(x.cost_price)}</b></div>
            <div><span>Total penjualan</span><b>${fmtRp(x.total_sell)}</b></div>
            <div><span>Total modal</span><b>${fmtRp(x.total_cost)}</b></div>
            <div><span>Keuntungan</span><b>${fmtRp(profitOf(x))}</b></div>
            <div><span>Supplier</span><b>${esc(x.supplier_name || "-")}</b></div>
            <div><span>Aktivasi</span><b>${fmtDate(x.activation_date)}</b></div>
            <div><span>Expired</span><b>${fmtDate(x.expired_date)} (${x.service_status === "Garansi" ? "Dalam garansi" : svcStatus(x.expired_date)})</b></div>
            <div><span>Pembayaran</span><b>${esc(x.payment_status)}</b></div>
            <div><span>Pengerjaan</span><b>${esc(x.work_status)}</b></div>
            <div><span>Garansi</span><b>${x.garansi_aktif ? "Aktif (ada bukti login)" : "Tidak aktif"}</b></div>
            <div style="grid-column:1/-1"><span>Catatan</span><b>${esc(x.note || "-")}</b></div>
          </div>
          ${window.hazzeGaransi ? window.hazzeGaransi.sectionHtml(x) : ""}
          <div class="form-actions"><button class="btn btn-ghost" type="button" data-close>Tutup</button></div>
        </div></div>`;
      return;
    }

    if (m.type === "edit") {
      root.innerHTML = `<div class="overlay" data-close>
        <form class="modal" id="edit-form" data-id="${x.id}">
          <h3>Edit Transaksi</h3>
          <p class="muted" style="margin-top:-6px">${esc(x.transaction_id)} · ${esc(x.customers?.name || "")}</p>
          <label class="f"><span>Supplier</span><input name="supplier" value="${esc(x.supplier_name || "")}" /></label>
          <div class="filter-grid">
            <label class="f"><span>Jumlah</span><input name="qty" type="number" min="1" value="${x.quantity}" required /></label>
            <label class="f"><span>Harga jual per unit</span><input name="sell" type="number" min="0" step="500" value="${x.sell_price}" required /></label>
            <label class="f"><span>Modal per unit</span><input name="cost" type="number" min="0" step="500" value="${x.cost_price}" required /></label>
            <label class="f"><span>Tanggal aktivasi</span><input name="act" type="date" value="${x.activation_date || ""}" required /></label>
            <label class="f"><span>Tanggal expired</span><input name="exp" type="date" value="${x.expired_date || ""}" required /></label>
            <label class="f"><span>Pembayaran</span><select name="payment">${selectOpts(PAYMENT, x.payment_status, null)}</select></label>
            <label class="f"><span>Pengerjaan</span><select name="work">${selectOpts(WORK, x.work_status, null)}</select></label>
          </div>
          <label class="f"><span>Catatan</span><input name="note" value="${esc(x.note || "")}" /></label>
          <div class="form-actions">
            <button class="btn" type="submit">Simpan Perubahan</button>
            <button class="btn btn-ghost" type="button" data-close>Batal</button>
          </div>
          <p class="err" id="modal-err"></p>
        </form></div>`;
      return;
    }

    if (m.type === "renew") {
      const start = (() => {
        const t = toISO(today());
        return x.expired_date && x.expired_date > t ? x.expired_date : t;
      })();
      const product = state.products.find((p) => p.app_name === x.app_name && (p.variant || "") === (x.variant || "") && p.duration === x.duration && !p.is_archived);
      const sell = product ? product.sell_price : x.sell_price;
      root.innerHTML = `<div class="overlay" data-close>
        <form class="modal" id="renew-form" data-id="${x.id}">
          <h3>Perpanjang Layanan</h3>
          <p class="muted" style="margin-top:-6px">Membuat transaksi baru untuk ${esc(x.customers?.name || "customer")}. Transaksi lama tetap tersimpan.</p>
          <label class="f"><span>Durasi</span>
            <select name="duration">${DURASI.map((d) => `<option ${d === x.duration ? "selected" : ""}>${d}</option>`).join("")}
              ${!DURASI.includes(x.duration) ? `<option selected>${esc(x.duration)}</option>` : ""}</select>
          </label>
          <div class="filter-grid">
            <label class="f"><span>Tanggal aktivasi baru</span><input name="act" type="date" value="${start}" required /></label>
            <label class="f"><span>Tanggal expired</span><input name="exp" type="date" value="${addDuration(start, x.duration) || ""}" required /></label>
            <label class="f"><span>Jumlah</span><input name="qty" type="number" min="1" value="${x.quantity}" required /></label>
            <label class="f"><span>Harga jual per unit</span><input name="sell" type="number" min="0" step="500" value="${sell}" required /></label>
            <label class="f"><span>Modal per unit</span><input name="cost" type="number" min="0" step="500" value="${x.cost_price}" required /></label>
            <label class="f"><span>Supplier</span><input name="supplier" value="${esc(x.supplier_name || "")}" /></label>
            <label class="f"><span>Pembayaran</span><select name="payment">${selectOpts(PAYMENT, "Belum Lunas", null)}</select></label>
          </div>
          <div class="form-actions">
            <button class="btn" type="submit">Simpan Perpanjangan</button>
            <button class="btn btn-ghost" type="button" data-close>Batal</button>
          </div>
          <p class="err" id="modal-err"></p>
        </form></div>`;
      return;
    }
  }

  // ---------- Aksi ----------
  async function saveEdit(form) {
    const id = form.dataset.id;
    const f = form.elements;
    const err = form.querySelector("#modal-err");
    const qty = Math.floor(Number(f.qty.value));
    const sell = Number(f.sell.value);
    const cost = Number(f.cost.value);
    if (!(qty >= 1)) { err.textContent = "Jumlah minimal 1."; return; }
    if (!(sell >= 0) || !(cost >= 0)) { err.textContent = "Harga harus berupa angka, minimal 0."; return; }
    if (!f.act.value || !f.exp.value) { err.textContent = "Tanggal aktivasi dan expired wajib diisi."; return; }
    if (f.exp.value < f.act.value) { err.textContent = "Expired tidak boleh sebelum aktivasi."; return; }

    const { error } = await sb().from("orders").update({
      supplier_name: f.supplier.value.trim() || null,
      quantity: qty,
      sell_price: sell,
      cost_price: cost,
      activation_date: f.act.value,
      expired_date: f.exp.value,
      payment_status: f.payment.value,
      work_status: f.work.value,
      note: f.note.value.trim() || null
    }).eq("id", id);
    if (error) { err.textContent = "Gagal menyimpan: " + error.message; return; }
    state.modal = null;
    state.msg = "Perubahan tersimpan ✿";
    await loadAll();
    render();
  }

  async function saveRenew(form) {
    const old = findRow(form.dataset.id);
    const f = form.elements;
    const err = form.querySelector("#modal-err");
    if (!old) return;
    const qty = Math.floor(Number(f.qty.value));
    const sell = Number(f.sell.value);
    const cost = Number(f.cost.value);
    if (!(qty >= 1)) { err.textContent = "Jumlah minimal 1."; return; }
    if (!(sell >= 0) || !(cost >= 0)) { err.textContent = "Harga harus berupa angka, minimal 0."; return; }
    if (!f.act.value || !f.exp.value) { err.textContent = "Tanggal aktivasi dan expired wajib diisi."; return; }
    if (f.exp.value < f.act.value) { err.textContent = "Expired tidak boleh sebelum aktivasi."; return; }

    const product = state.products.find((p) => p.app_name === old.app_name && (p.variant || "") === (old.variant || "") && p.duration === f.duration.value && !p.is_archived);
    const todayISO = toISO(today());
    const base = {
      order_date: todayISO,
      customer_id: old.customer_id,
      product_id: product ? product.id : null,
      app_name: old.app_name,
      variant: old.variant || "",
      duration: f.duration.value,
      quantity: qty,
      sell_price: sell,
      cost_price: cost,
      supplier_name: f.supplier.value.trim() || null,
      activation_date: f.act.value,
      expired_date: f.exp.value,
      payment_status: f.payment.value,
      work_status: "Menunggu",
      service_status: f.exp.value < todayISO ? "Expired" : "Aktif",
      note: `Perpanjangan dari ${old.transaction_id}`
    };

    state.busy = true;
    try {
      let saved = false;
      let lastError = null;
      for (let i = 0; i < 3 && !saved; i++) {
        const { error } = await sb().from("orders").insert({ ...base, transaction_id: genTrxId() });
        if (!error) saved = true;
        else if (error.code === "23505") lastError = error;
        else throw error;
      }
      if (!saved) throw lastError || new Error("Gagal membuat ID transaksi.");
      state.modal = null;
      state.msg = "Perpanjangan tercatat sebagai transaksi baru ✿";
      await loadAll();
      render();
    } catch (ex) {
      err.textContent = "Gagal menyimpan: " + (ex.message || ex);
    } finally {
      state.busy = false;
    }
  }

  async function removeOrder(id) {
    const x = findRow(id);
    if (!x) return;
    const ok = confirm(`Hapus transaksi ${x.transaction_id} (${x.customers?.name || ""})?\nTindakan ini tidak bisa dibatalkan.`);
    if (!ok) return;
    const { error } = await sb().from("orders").delete().eq("id", id);
    if (error) { alert("Gagal menghapus: " + error.message); return; }
    state.msg = "Transaksi dihapus.";
    await loadAll();
    render();
  }

  function exportExcel() {
    if (typeof XLSX === "undefined") {
      alert("Library Excel belum termuat. Periksa koneksi internet lalu muat ulang halaman.");
      return;
    }
    const rows = filtered().map((x) => ({
      "Tanggal Order": x.order_date,
      "ID Transaksi": x.transaction_id,
      "Nama Customer": x.customers?.name || "",
      "No HP": x.customers?.phone || "",
      "Aplikasi": x.app_name,
      "Varian": x.variant || "",
      "Durasi": x.duration,
      "Jumlah": x.quantity,
      "Supplier": x.supplier_name || "",
      "Harga Jual": Number(x.total_sell),
      "Modal": Number(x.total_cost),
      "Keuntungan": profitOf(x),
      "Tanggal Aktivasi": x.activation_date || "",
      "Tanggal Expired": x.expired_date || "",
      "Status Pembayaran": x.payment_status,
      "Status Pengerjaan": x.work_status,
      "Status Layanan": svcStatus(x.expired_date)
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Rekap Order");
    XLSX.writeFile(wb, `rekap-order-${toISO(new Date())}.xlsx`);
  }

  // ---------- Event ----------
  function onInput(e) {
    if (e.target.id === "f-search") {
      state.search = e.target.value;
      renderList();
    }
  }

  function onChange(e) {
    const n = e.target.name;
    if (!n) return;
    if (n === "period") {
      state.period = e.target.value;
      if (state.period === "custom" && !state.from) {
        const t = today();
        state.from = toISO(addDays(t, -29));
        state.to = toISO(t);
      }
      render();
      return;
    }
    if (n === "from" || n === "to") {
      state[n] = e.target.value;
      renderList();
      return;
    }
    if (["fApp", "fSupp", "fPay", "fWork", "fSvc"].includes(n)) {
      state[n] = e.target.value;
      renderList();
    }
  }

  function onClick(e) {
    const t = e.target;
    if (t.closest("#btn-export")) { exportExcel(); return; }

    const btn = t.closest("[data-act]");
    if (btn) {
      const id = btn.dataset.id;
      const act = btn.dataset.act;
      if (act === "delete") { removeOrder(id); return; }
      state.modal = { type: act, id };
      renderModal();
      return;
    }

    // Tutup modal: klik latar belakang (overlay) atau tombol bertanda data-close.
    // Klik di dalam kotak modal tidak menutup modal.
    const closer = t.closest("[data-close]");
    if (closer) {
      const insideModal = t.closest(".modal");
      if (closer.classList.contains("overlay") && insideModal) return;
      state.modal = null;
      renderModal();
    }
  }

  function onSubmit(e) {
    e.preventDefault();
    if (state.busy) return;
    if (e.target.id === "edit-form") saveEdit(e.target);
    else if (e.target.id === "renew-form") saveRenew(e.target);
  }

  // ---------- Entry point ----------
  function injectStyle() {
    if (document.getElementById("rekap-style")) return;
    const s = document.createElement("style");
    s.id = "rekap-style";
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  // Dipanggil oleh modul garansi setelah garansi dimulai atau diselesaikan
  window.hazzeRefresh = async function () {
    await loadAll();
    render();
    renderModal();
  };

  window.renderRekap = function (container) {
    injectStyle();
    state.container = container;
    state.modal = null;
    if (!container.dataset.rekapBound) {
      container.addEventListener("input", onInput);
      container.addEventListener("change", onChange);
      container.addEventListener("click", onClick);
      container.addEventListener("submit", onSubmit);
      container.dataset.rekapBound = "1";
    }
    container.innerHTML = `<p class="muted note">Memuat transaksi...</p>`;
    loadAll()
      .then(render)
      .catch((err) => {
        container.innerHTML = `<div class="card note"><p>Rekap belum bisa dimuat.</p>
          <p class="muted">${esc(err.message || err)}</p></div>`;
      });
  };
})();
